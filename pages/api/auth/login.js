import { getGoogleAuthUrl } from '../../../lib/google-auth';

export default function handler(req, res) {
  const authUrl = getGoogleAuthUrl();
  res.redirect(authUrl);
}
