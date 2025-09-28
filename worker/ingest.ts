import { Hono } from 'hono';
import { authMiddleware } from './middleware';
type Env = {
  UPLOADS_BUCKET: R2Bucket;
};
type Variables = {
    user: { id: string };
};
const app = new Hono<{ Bindings: Env, Variables: Variables }>();
app.use('/upload', authMiddleware);
app.post('/upload', async (c) => {
  try {
    const user = c.get('user');
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return c.json({ success: false, error: 'No file uploaded or invalid file type.' }, 400);
    }
    const fileKey = `${crypto.randomUUID()}-${file.name}`;
    await c.env.UPLOADS_BUCKET.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        userId: user.id,
      },
    });
    return c.json({
      success: true,
      message: `File '${file.name}' uploaded successfully.`,
      key: fileKey,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Failed to process file upload.' }, 500);
  }
});
export default app;