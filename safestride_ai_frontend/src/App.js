import React from 'react';
import './App.css';

// PUBLIC_INTERFACE
function App() {
  // Theme colors as CSS variables
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--base-light', '#4CAF50');
    root.style.setProperty('--primary', '#4CAF50');
    root.style.setProperty('--secondary', '#FFC107');
    root.style.setProperty('--accent', '#E91E63');
    root.style.setProperty('--base-dark', '#fff');
    // For dark-on-light text colors
    root.style.setProperty('--text-color', '#222222');
    root.style.setProperty('--text-secondary', 'rgba(34,34,34,0.7)');
    root.style.setProperty('--border-color', 'rgba(34,34,34,0.075)');
    // Keep navigation slightly raised over background
  }, []);

  return (
    <div className="app" style={{ background: '#F7F7F9', minHeight: '100vh' }}>
      <nav className="navbar" style={{ background: "var(--primary)", color: "white" }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="logo">
              <span
                className="logo-symbol"
                style={{
                  color: "var(--accent)",
                  fontWeight: 800,
                  fontSize: "1.3rem",
                  marginRight: 6
                }}
                aria-hidden="true"
              >🚶‍♂️</span>{" "}
              SafeStride AI
            </div>
            <UserMenuPlaceholder />
          </div>
        </div>
      </nav>
      <main style={{ flex: 1, paddingTop: 96 }}>
        <div className="container">
          <section className="hero" style={{ padding: "48px 0 24px 0", alignItems: "flex-start" }}>
            <div className="subtitle" style={{ color: "var(--primary)", textAlign: "left" }}>
              Real-time Safety. Smarter Routing.
            </div>
            <h1 className="title" style={{ color: "#222", fontWeight: 700, textAlign: "left", fontSize: "2.4rem", margin: "12px 0" }}>
              Move Safer, Walk Smarter – SafeStride AI
            </h1>
            <div className="description" style={{ color: "var(--text-secondary)", fontSize: "1.15rem", textAlign: "left" }}>
              The AI-driven web app that gets you from A to B the safest way possible, powered by real-time data and intelligent technology.
            </div>
            <SOSButtonPlaceholder />
          </section>
          <section style={{ display: 'flex', flexWrap: "wrap", gap: 32, margin: "24px 0" }}>
            <FeatureColumn>
              <FeatureCard name="Real-time Crime Data" color="var(--primary)">
                <CrimeDataPlaceholder />
              </FeatureCard>
              <FeatureCard name="Lighting Detection" color="var(--secondary)">
                <LightingDetectionPlaceholder />
              </FeatureCard>
              <FeatureCard name="Crowd Density Analysis" color="var(--accent)">
                <CrowdDensityPlaceholder />
              </FeatureCard>
            </FeatureColumn>
            <FeatureColumn>
              <FeatureCard name="Weather Adaptation" color="var(--secondary)">
                <WeatherAdaptationPlaceholder />
              </FeatureCard>
              <FeatureCard name="Emergency SOS" color="var(--accent)">
                <SOSFeaturePlaceholder />
              </FeatureCard>
              <FeatureCard name="User Personalization" color="var(--primary)">
                <PersonalizationPlaceholder />
              </FeatureCard>
            </FeatureColumn>
            <FeatureColumn>
              <FeatureCard name="Data Aggregation" color="var(--primary)">
                <DataAggregationPlaceholder />
              </FeatureCard>
              <FeatureCard name="AI Routing Engine" color="var(--secondary)">
                <AIRoutingPlaceholder />
              </FeatureCard>
              <FeatureCard name="User Management" color="var(--accent)">
                <UserManagementPlaceholder />
              </FeatureCard>
              <FeatureCard name="Notification Service" color="var(--secondary)">
                <NotificationServicePlaceholder />
              </FeatureCard>
            </FeatureColumn>
          </section>
        </div>
      </main>
      <footer style={{
        background: '#fff',
        color: 'var(--accent)',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        padding: '18px 0',
        marginTop: 32,
        fontWeight: 500,
        letterSpacing: '.08em',
        fontSize: '0.96rem'
      }}>
        © {new Date().getFullYear()} SafeStride AI. Be alert. Be safe.
      </footer>
    </div>
  );
}

// ========== Feature Column Layout
function FeatureColumn({ children }) {
  // PUBLIC_INTERFACE
  return (
    <div
      style={{
        minWidth: 260,
        flex: '1 1 280px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {children}
    </div>
  );
}

// ========== FeatureCard Component
function FeatureCard({ name, color, children }) {
  // PUBLIC_INTERFACE
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(44,44,44,.07)',
        padding: '22px 18px',
        marginBottom: 4,
        borderLeft: `4px solid ${color || "var(--primary)"}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 120,
        transition: 'box-shadow 0.1s'
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: '1rem' }}>{name}</span>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

// ========== Placeholder Components for each Feature

// PUBLIC_INTERFACE
function CrimeDataPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="alert" style={{ color: "var(--primary)" }}>🛑</span> Map of local crime hotspots + live alerts will show here.
    </div>
  );
}
// PUBLIC_INTERFACE
function LightingDetectionPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="light" style={{ color: "var(--secondary)" }}>💡</span> Well-lit routes and lighting markers to be visualized.
    </div>
  );
}
// PUBLIC_INTERFACE
function CrowdDensityPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="crowd" style={{ color: "var(--accent)" }}>👥</span> Crowd analysis + recommended less crowded alternate paths.
    </div>
  );
}
// PUBLIC_INTERFACE
function WeatherAdaptationPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="weather" style={{ color: "var(--secondary)" }}>☁️</span> Weather conditions will adapt suggestions for safe routes.
    </div>
  );
}
// PUBLIC_INTERFACE
function SOSFeaturePlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="SOS" style={{ color: "var(--accent)" }}>🚨</span> Emergency SOS. One-tap access with location sharing.
    </div>
  );
}
// PUBLIC_INTERFACE
function PersonalizationPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="settings" style={{ color: "var(--primary)" }}>⚙️</span> Set preferences & feedback for personalized suggestions.
    </div>
  );
}
// PUBLIC_INTERFACE
function DataAggregationPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="database" style={{ color: "var(--primary)" }}>🗄️</span> Data integration from crime, lighting & weather sources.
    </div>
  );
}
// PUBLIC_INTERFACE
function AIRoutingPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="AI" style={{ color: "var(--secondary)" }}>🤖</span> AI calculates the safest, most comfortable route for you.
    </div>
  );
}
// PUBLIC_INTERFACE
function UserManagementPlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="user" style={{ color: "var(--accent)" }}>👤</span> User profile, feedback and auth features (login, prefs).
    </div>
  );
}
// PUBLIC_INTERFACE
function NotificationServicePlaceholder() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="bell" style={{ color: "var(--secondary)" }}>🔔</span> Real-time notifications for risks, route changes, weather.
    </div>
  );
}

// ========== Top Nav: User Profile Placeholder
function UserMenuPlaceholder() {
  // PUBLIC_INTERFACE
  return (
    <button className="btn" style={{
      background: "var(--accent)",
      color: "white",
      fontWeight: 600
    }}>User</button>
  );
}

// ========== Hero Area: SOS Feature Placeholder
function SOSButtonPlaceholder() {
  // PUBLIC_INTERFACE
  return (
    <button
      className="btn btn-large"
      aria-label="Trigger Emergency SOS"
      style={{
        background: "var(--accent)",
        color: "white",
        fontSize: "1.13rem",
        fontWeight: 700,
        padding: "15px 36px",
        borderRadius: 22,
        margin: "38px 0 0 0",
        letterSpacing: ".03em",
        boxShadow: "0 3px 8px rgba(209,42,102,0.08)",
      }}
      tabIndex={0}
    >
      <span style={{ fontWeight: 900, fontSize: 20, marginRight: 5 }} role="img" aria-label="alarm">🚨</span>
      Emergency SOS
    </button>
  );
}

export default App;