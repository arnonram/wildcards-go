import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { AppBar, Box, Container, IconButton, Toolbar, Typography } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '../../helpers/context/theme-context';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: isDark
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
          borderBottom: isDark
            ? '1px solid rgba(201, 162, 39, 0.3)'
            : '1px solid rgba(138, 110, 26, 0.3)',
        }}
      >
        <Toolbar>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: 1,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontFamily: "'Cinzel', 'Georgia', 'serif'",
                fontWeight: 700,
                color: isDark ? '#c9a227' : '#8a6e1a',
                letterSpacing: 1,
              }}
            >
              Wild Cards Go
            </Typography>
          </Link>
          <IconButton
            onClick={toggleTheme}
            sx={{ color: isDark ? '#c9a227' : '#8a6e1a' }}
            aria-label="Toggle theme"
          >
            {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1 }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          borderTop: isDark
            ? '1px solid rgba(201, 162, 39, 0.2)'
            : '1px solid rgba(138, 110, 26, 0.2)',
          bgcolor: isDark ? '#0a0a14' : '#f5f5f5',
          py: 3,
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 600, textAlign: { xs: 'center', sm: 'left' } }}
            >
              This product uses the{' '}
              <a
                href="https://peginc.com/licensing/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: isDark ? '#c9a227' : '#8a6e1a' }}
              >
                Savage Worlds Fan License
              </a>
              . Savage Worlds and all associated logos and trademarks are copyrights of Pinnacle
              Entertainment Group.
            </Typography>
            <Image
              src="/images/SW_LOGO_FP_2018-300x200-1.png"
              alt="Savage Worlds Fan License Logo"
              width={120}
              height={80}
              style={{ objectFit: 'contain' }}
            />
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
