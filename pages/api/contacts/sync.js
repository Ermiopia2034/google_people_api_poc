import { google } from 'googleapis';
import { parse } from 'cookie';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const session = cookies.session ? JSON.parse(cookies.session) : null;

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get user's tokens from database
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('access_token, refresh_token')
      .eq('id', session.userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: userData.access_token,
      refresh_token: userData.refresh_token
    });

    // Initialize People API
    const people = google.people({ version: 'v1', auth: oauth2Client });

    // Fetch contacts
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,birthdays,photos'
    });

    const connections = response.data.connections || [];
    
    // Filter and format contacts with birthdays
    const contactsWithBirthdays = connections
      .filter(person => person.birthdays && person.birthdays.length > 0)
      .map(person => {
        const birthday = person.birthdays[0].date;
        const formattedBirthday = birthday ? 
          `${birthday.year || '1900'}-${String(birthday.month).padStart(2, '0')}-${String(birthday.day).padStart(2, '0')}` : 
          null;

        return {
          google_resource_name: person.resourceName,
          name: person.names?.[0]?.displayName || 'Unknown',
          email: person.emailAddresses?.[0]?.value || null,
          birthday: formattedBirthday,
          photo_url: person.photos?.[0]?.url || null
        };
      });

    // Store contacts in database using database function
    const { data: insertResult, error: insertError } = await supabaseAdmin.rpc('upsert_contacts', {
      p_user_id: session.userId,
      p_contacts: contactsWithBirthdays
    });

    if (insertError) {
      console.error('Error storing contacts:', insertError);
      return res.status(500).json({ error: 'Failed to store contacts' });
    }

    res.status(200).json({ 
      message: 'Contacts synced successfully',
      count: contactsWithBirthdays.length 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync contacts' });
  }
}
