import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contacts/list');
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      } else if (response.status === 401) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
    setLoading(false);
  };

  const syncContacts = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/contacts/sync', { method: 'POST' });
      if (response.ok) {
        await fetchContacts();
        alert('Contacts synced successfully!');
      } else {
        alert('Failed to sync contacts');
      }
    } catch (error) {
      console.error('Error syncing contacts:', error);
      alert('Error syncing contacts');
    }
    setSyncing(false);
  };

  const handleLogout = () => {
    router.push('/api/auth/logout');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1>Contacts with Birthdays</h1>
        <div>
          <button 
            onClick={syncContacts}
            disabled={syncing}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              backgroundColor: '#34a853',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.7 : 1
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Contacts'}
          </button>
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ea4335',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <p>No contacts with birthdays found.</p>
          <p>Click &quot;Sync Contacts&quot; to import from Google.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {contacts.map((contact) => (
            <div 
              key={contact.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                {contact.photo_url && (
                  <img 
                    src={contact.photo_url}
                    alt={contact.name}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      marginRight: '15px'
                    }}
                  />
                )}
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{contact.name}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    {contact.email || 'No email'}
                  </p>
                </div>
              </div>
              <div style={{
                borderTop: '1px solid #eee',
                paddingTop: '10px',
                marginTop: '10px'
              }}>
                <p style={{ margin: 0 }}>
                  🎂 Birthday: {formatDate(contact.birthday)}
                </p>
                {contact.days_until_birthday !== null && contact.days_until_birthday >= 0 && (
                  <p style={{ margin: '5px 0 0 0', color: '#4285f4', fontSize: '14px' }}>
                    {contact.days_until_birthday === 0 
                      ? "Today!" 
                      : `In ${contact.days_until_birthday} days`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
