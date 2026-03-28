import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Package, 
  Store, 
  Image as ImageIcon, 
  LogOut,
  ChevronRight
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const menuItems = [
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Stores', path: '/stores', icon: Store },
    { name: 'Images', path: '/images', icon: ImageIcon },
  ];

  return (
    <aside className="sidebar">
      <div className="branding" style={{ padding: '0 1rem 2rem' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '-0.5px' }}>
          DELIVERY<span style={{ color: 'var(--text-main)' }}>ADMIN</span>
        </h2>
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
            <ChevronRight size={14} className="chevron" style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <button className="nav-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
