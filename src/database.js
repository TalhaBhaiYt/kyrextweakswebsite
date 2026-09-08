'use strict';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key (bypasses RLS)
);

/* ── Users ── */
const users = {
  async findByEmail(email) {
    const { data } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
    return data;
  },
  async findByUsername(username) {
    const { data } = await supabase.from('users').select('*').ilike('username', username).maybeSingle();
    return data;
  },
  async findById(id) {
    const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    return data;
  },
  async findAll() {
    const { data } = await supabase
      .from('users')
      .select('id,username,email,role,paid,created_at,last_login')
      .order('created_at', { ascending: false });
    return data || [];
  },
  async create({ username, email, password, role, paid }) {
    const { data, error } = await supabase
      .from('users')
      .insert({ username, email, password, role, paid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async grantAccess(id) {
    await supabase.from('users').update({ role: 'buyer', paid: true }).eq('id', id);
  },
  async revokeAccess(id) {
    await supabase.from('users').update({ role: 'newbie', paid: false }).eq('id', id);
  },
  async setRole(id, role) {
    const update = { role };
    if (role === 'admin' || role === 'buyer') update.paid = true;
    if (role === 'newbie') update.paid = false;
    await supabase.from('users').update(update).eq('id', id);
  },
  async updateLastLogin(id) {
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', id);
  },
  async delete(id) {
    await supabase.from('users').delete().eq('id', id);
  },
  async stats() {
    const [total, buyers, newbies, admins, downloads] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'buyer'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'newbie'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('download_logs').select('*', { count: 'exact', head: true }),
    ]);
    return {
      total:     total.count     || 0,
      buyers:    buyers.count    || 0,
      newbies:   newbies.count   || 0,
      admins:    admins.count    || 0,
      downloads: downloads.count || 0,
    };
  },
};

/* ── Logs ── */
const logs = {
  async add(userId, filename, ip) {
    await supabase.from('download_logs').insert({ user_id: userId, filename, ip });
  },
  async recent() {
    const { data } = await supabase
      .from('download_logs')
      .select('id, filename, ip, downloaded_at, users(username)')
      .order('downloaded_at', { ascending: false })
      .limit(100);
    return (data || []).map(l => ({ ...l, username: l.users?.username }));
  },
};

/* ── Purchases ── */
const purchases = {
  async create(userId, note) {
    const { error } = await supabase
      .from('purchase_requests')
      .insert({ user_id: userId, note });
    if (error) throw error;
  },
  async findAll() {
    const { data } = await supabase
      .from('purchase_requests')
      .select('*, users(username, email)')
      .order('created_at', { ascending: false });
    return (data || []).map(r => ({ ...r, username: r.users?.username, email: r.users?.email }));
  },
  async findByUser(userId) {
    const { data } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  },
  async findById(id) {
    const { data } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data;
  },
  async updateStatus(status, id) {
    await supabase.from('purchase_requests').update({ status }).eq('id', id);
  },
  async countPending(userId) {
    const { count } = await supabase
      .from('purchase_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending');
    return { cnt: count || 0 };
  },
};

/* ── Storage (file uploads/downloads) ── */
const storage = {
  BUCKET: 'downloads',
  async ensureBucket() {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets.find(b => b.name === this.BUCKET)) {
      const { error } = await supabase.storage.createBucket(this.BUCKET, { public: false });
      if (error && !/already exists/i.test(error.message)) throw error;
    }
  },
  async listFiles() {
    await this.ensureBucket();
    const { data, error } = await supabase.storage.from(this.BUCKET).list('', { sortBy: { column: 'name' } });
    if (error) throw error;
    return (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
  },
  async uploadFile(filename, buffer, mimetype) {
    await this.ensureBucket();
    const { error } = await supabase.storage
      .from(this.BUCKET)
      .upload(filename, buffer, { contentType: mimetype, upsert: true });
    if (error) throw error;
  },
  async deleteFile(filename) {
    const { error } = await supabase.storage.from(this.BUCKET).remove([filename]);
    if (error) throw error;
  },
  async getSignedUrl(filename) {
    const { data, error } = await supabase.storage
      .from(this.BUCKET)
      .createSignedUrl(filename, 60); // 60 seconds
    if (error) throw error;
    return data.signedUrl;
  },
  async createSignedUploadUrl(filename) {
    await this.ensureBucket();
    const { data, error } = await supabase.storage
      .from(this.BUCKET)
      .createSignedUploadUrl(filename);
    if (error) throw error;
    return data; // { signedUrl, path, token }
  },
};

module.exports = { supabase, users, logs, purchases, storage };
