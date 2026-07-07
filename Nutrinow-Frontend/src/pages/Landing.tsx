import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
            <Link to="/termos" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Termos</Link>
            <Link to="/privacidade" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Privacidade</Link>
            <Link to="/lgpd" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>LGPD</Link>
          </div>
          <div>
            <h4>Suporte</h4>
            <Link to="/feedbacks" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Feedbacks</Link>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '2rem', paddingTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
          &copy; {new Date().getFullYear()} NutriNow. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
