import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Layout({ title, links = [], children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2 className="sidebar-title">National Site Hub</h2>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1>{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}