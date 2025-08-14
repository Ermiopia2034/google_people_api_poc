import axios from 'axios';
import { supabaseAdmin } from '../../../lib/supabase';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { id, email, name, picture } = userResponse.data;

    console.log('User data from Google:', { id, email, name, picture });

    // Upsert user in Supabase - FIXED VERSION
    const { data: userData, error: userError } = await supabaseAdmin.rpc('upsert_user', {
      p_google_id: id,
      p_email: email,
      p_name: name || '',
      p_picture: picture || '',
      p_access_token: access_token,
      p_refresh_token: refresh_token || ''
    });

    console.log('Supabase response:', { userData, userError });

    if (userError) {
      console.error('Error upserting user:', userError);
      // Log more details for debugging
      console.error('Full error:', JSON.stringify(userError, null, 2));
      return res.status(500).json({ error: 'Failed to save user', details: userError });
    }

    if (!userData || userData.length === 0) {
      console.error('No user data returned from upsert');
      return res.status(500).json({ error: 'No user data returned' });
    }

    // Set session cookie
    const sessionData = {
      userId: userData[0].id,
      googleId: id,
      accessToken: access_token
    };

    res.setHeader('Set-Cookie', serialize('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    }));

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Auth error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Authentication failed', 
      details: error.response?.data || error.message 
    });
  }
}
