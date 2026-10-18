import supabaseAdmin from '../config/supabaseAdmin.js';

async function uploadImageToSupabase(fileBuffer, mimetype, folder) {
  const filename = `${folder}/${Date.now()}.jpg`;

  const { data, error } = await supabaseAdmin.storage
    .from('apleshahar')
    .upload(filename, fileBuffer, {
      contentType: mimetype,
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabaseAdmin.storage
    .from('apleshahar')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

export { uploadImageToSupabase };