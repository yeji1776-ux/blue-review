export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { refresh_token } = JSON.parse(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  if (!refresh_token) return res.status(400).json({ error: 'missing refresh_token' });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } else {
    res.status(400).json({ error: data.error, description: data.error_description });
  }
}
