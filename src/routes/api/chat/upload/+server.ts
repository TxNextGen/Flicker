import { json } from '@sveltejs/kit';
import sharp from 'sharp';

export const POST = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return json({ error: 'No file uploaded.' }, { status: 400 });
  }
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return json({ error: 'Invalid file type.' }, { status: 400 });
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  try {
    let jpegBuffer = await sharp(buffer)
      .resize({ width: 240, height: 240, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 1 })
      .toBuffer();
    const mpbase64 = jpegBuffer.toString('base64');
    const mpurl = `data:image/jpeg;base64,${mpbase64}`;
    jpegBuffer = await sharp(buffer)
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
      const base64 = jpegBuffer.toString('base64');
    const url = `data:image/jpeg;base64,${base64}`;
    return json({ modelOptimized:mpurl, viewingOptimized:url });
  } catch (e) {
    return json({ error: 'Image processing failed.' }, { status: 500 });
  }
}; 