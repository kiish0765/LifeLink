import profileKishore from '../profile_kishore.jpeg';

export default function About() {
  return (
    <div className="card" style={{ padding: '3rem 1.5rem', maxWidth: '900px', margin: 'auto', backgroundColor: 'transparent' }}>
      
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', color: '#FFFFFF', fontWeight: '800', marginBottom: '1rem' }}>
          The LifeLink Mission
        </h1>
        <div style={{ width: '80px', height: '4px', backgroundColor: '#FF4D4D', margin: 'auto' }}></div>
      </div>

      {/* Aligned Impact Statement */}
      <div style={{ textAlign: 'center', margin: '0 auto 4rem auto', maxWidth: '800px' }}>
        <p style={{ 
          fontSize: '1.4rem', 
          lineHeight: '1.6', 
          color: '#F9FAFB', 
          fontWeight: '500',
          fontStyle: 'italic',
          marginBottom: '2rem'
        }}>
          "In critical medical emergencies, time is the only variable that cannot be recovered."
        </p>
        
        <p style={{ 
          fontSize: '1.2rem', 
          lineHeight: '1.9', 
          color: '#E5E7EB'
        }}>
          <strong style={{ color: '#FF4D4D' }}>LifeLink</strong> is a high-performance coordination ecosystem engineered 
          to bridge the gap between donors and hospitals instantly[cite: 16]. By automating donor matching and 
          implementing real-time WebSocket alerts, the platform slashes response times by <span style={{ color: '#FF4D4D', fontWeight: 'bold' }}>60%</span> [cite: 19, 22] 
          and ensures that life-saving resources reach those in need without delay.
        </p>
      </div>

      {/* Technical Highlights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        <div style={{ border: '1px solid #374151', padding: '1.5rem', borderRadius: '1rem', backgroundColor: 'rgba(55, 65, 81, 0.3)' }}>
          <h3 style={{ color: '#FF4D4D', marginBottom: '0.5rem' }}>50ms Latency</h3>
          <p style={{ color: '#D1D5DB', fontSize: '0.95rem' }}>Optimized MongoDB queries with advanced indexing for near-instant data retrieval[cite: 10, 20].</p>
        </div>
        <div style={{ border: '1px solid #374151', padding: '1.5rem', borderRadius: '1rem', backgroundColor: 'rgba(55, 65, 81, 0.3)' }}>
          <h3 style={{ color: '#FF4D4D', marginBottom: '0.5rem' }}>10K+ Requests</h3>
          <p style={{ color: '#D1D5DB', fontSize: '0.95rem' }}>A scalable REST API architecture designed to handle high-volume daily traffic seamlessly[cite: 9, 19].</p>
        </div>
        <div style={{ border: '1px solid #374151', padding: '1.5rem', borderRadius: '1rem', backgroundColor: 'rgba(55, 65, 81, 0.3)' }}>
          <h3 style={{ color: '#FF4D4D', marginBottom: '0.5rem' }}>Real-Time Sync</h3>
          <p style={{ color: '#D1D5DB', fontSize: '0.95rem' }}>Integrated Redis caching and WebSockets for live donor tracking and instant alerts[cite: 17, 21, 22].</p>
        </div>
      </div>

      {/* Developer Profile Card */}
      <div style={{ 
        textAlign: 'center', 
        backgroundColor: '#1F2937', 
        padding: '3rem 2rem', 
        borderRadius: '2rem', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        border: '1px solid #374151'
      }}>
        <img
          src={profileKishore}
          alt="Kishore D"
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid #FF4D4D',
            boxShadow: '0 0 30px rgba(255, 77, 77, 0.2)',
          }}
        />
        <h2 style={{ marginTop: '1.5rem', fontSize: '2rem', color: '#FFFFFF' }}>Kishore D</h2>
        
        <p style={{ color: '#FF4D4D', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>
          Lead Developer & Architect
        </p>
        
        <p style={{ color: '#9CA3AF', marginTop: '1rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Integrated M.Tech Software Engineering (2022-2027) <br />
          Vellore Institute of Technology, Chennai 
        </p>
        
        {/* Professional Links */}
        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <a
            href="https://linkedin.com/in/kishore-dhayanithi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              backgroundColor: '#0077B5', 
              color: '#FFFFFF', 
              padding: '0.8rem 2.5rem', 
              borderRadius: '12px', 
              textDecoration: 'none',
              fontWeight: '700',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 14px 0 rgba(0, 119, 181, 0.4)'
            }}
          >
            LinkedIn
          </a>
    
        </div>
      </div>
    </div>
  );
}