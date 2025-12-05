// Navbar Component - Navigation bar with authentication links
import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaBars,
  FaCompass,
  FaHeart,
  FaHome,
  FaSearch,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaUser,
  FaUserPlus
} from 'react-icons/fa';
import { MdMovie, MdRecommend } from 'react-icons/md';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = useMemo(
    () => [
      { to: '/', label: 'Home', icon: FaHome },
      { to: '/search', label: 'Discover', icon: FaSearch },
      { to: '/recommendations', label: 'AI Picks', icon: MdRecommend, authOnly: true },
      { to: '/favorites', label: 'Favorites', icon: FaHeart, authOnly: true }
    ],
    []
  );

  const filteredNavItems = navItems.filter((item) => (item.authOnly ? isAuthenticated : true));

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const userInitial = user?.username?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <header className={`glass-navbar ${scrolled ? 'glass-navbar--scrolled' : ''}`}>
      <div className="glass-navbar__inner">
        <Link to="/" className="glass-navbar__brand" onClick={closeMenu}>
          <span className="brand-icon">
            <MdMovie size={20} />
          </span>
          <div>
            <span className="brand-title">CineSense</span>
            <span className="brand-tagline">Mood-first cinema picks</span>
          </div>
        </Link>

        <button
          className="glass-navbar__burger"
          aria-label={menuOpen ? 'Kapat' : 'Menüyü aç'}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
        </button>

        <nav className={`glass-navbar__links ${menuOpen ? 'is-open' : ''}`}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className={({ isActive }) => `glass-navbar__link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={`glass-navbar__actions ${menuOpen ? 'is-open' : ''}`}>
          {isAuthenticated ? (
            <>
              <Link 
                to="/profile" 
                className="glass-navbar__profile"
                onClick={closeMenu}
                style={{ 
                  textDecoration: 'none',
                  transform: 'none',
                  scale: 1,
                  width: 'auto',
                  height: 'auto'
                }}
              >
                <span className="profile-avatar">{userInitial}</span>
                <span className="profile-name">{user?.username}</span>
              </Link>
              <button className="ghost-btn" onClick={handleLogout}>
                <FaSignOutAlt size={14} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost-btn" onClick={closeMenu}>
                <FaSignInAlt size={14} />
                <span>Login</span>
              </Link>
              <Link to="/register" className="gradient-btn" onClick={closeMenu}>
                <FaUserPlus size={14} />
                <span>Get Started</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

