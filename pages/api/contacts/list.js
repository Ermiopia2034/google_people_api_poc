import { parse } from 'cookie';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const session = cookies.session ? JSON.parse(cookies.session) : null;

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get contacts using database function
    const { data: contacts, error } = await supabaseAdmin.rpc('get_user_contacts_with_birthdays', {
      p_user_id: session.userId
    });

    if (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }

    res.status(200).json({ contacts });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
} 
