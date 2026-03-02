import { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  ButtonBase,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import UniversityPortal from './components/UniversityPortal';
import VerificationPortal from './components/VerificationPortal';
import StudentPortal from './components/StudentPortal';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    secondary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: '#3b82f6',
    },
    background: {
      default: '#07071a',
      paper: '#0d0d20',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    divider: 'rgba(139, 92, 246, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.025em' },
    h6: { fontWeight: 600, letterSpacing: '-0.015em' },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600, letterSpacing: '0.01em' },
    body1: { letterSpacing: '-0.01em' },
    body2: { letterSpacing: '-0.005em' },
    caption: { letterSpacing: '0.06em' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 0 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': { background: 'rgba(139,92,246,0.3)', borderRadius: 3 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          padding: '9px 20px',
          fontSize: '0.875rem',
          letterSpacing: '0.01em',
        },
        contained: {
          boxShadow: 'none',
          background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
          color: '#ffffff',
          '&:hover': {
            boxShadow: '0 0 0 1px rgba(139,92,246,0.5), 0 8px 32px rgba(139,92,246,0.35)',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          },
          '&.Mui-disabled': {
            background: 'rgba(139,92,246,0.12)',
            color: 'rgba(255,255,255,0.25)',
          },
        },
        outlined: {
          borderColor: 'rgba(139,92,246,0.35)',
          color: '#a78bfa',
          '&:hover': {
            borderColor: 'rgba(139,92,246,0.7)',
            background: 'rgba(139,92,246,0.07)',
          },
        },
        text: {
          '&:hover': { background: 'rgba(139,92,246,0.07)' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '50%',
          '&:hover': { background: 'rgba(139,92,246,0.1)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d0d20',
          border: '1px solid rgba(139,92,246,0.1)',
        },
        elevation0: { boxShadow: 'none' },
        elevation1: { boxShadow: '0 1px 16px rgba(0,0,0,0.4)' },
        elevation2: { boxShadow: '0 4px 32px rgba(0,0,0,0.45)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d0d20',
          border: '1px solid rgba(139,92,246,0.1)',
          boxShadow: '0 1px 16px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d0d20',
          border: '1px solid rgba(139,92,246,0.1)',
          boxShadow: 'none',
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: { minHeight: 52, '&.Mui-expanded': { minHeight: 52 } },
        content: { margin: '14px 0', '&.Mui-expanded': { margin: '14px 0' } },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            fontSize: '0.9rem',
            '& fieldset': { borderColor: 'rgba(139,92,246,0.25)' },
            '&:hover fieldset': { borderColor: 'rgba(139,92,246,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#8b5cf6', borderWidth: 1.5 },
            '& input': { color: '#f1f5f9' },
            '& input::placeholder': { color: '#4a5568', opacity: 1 },
            '& .MuiSelect-select': { color: '#f1f5f9' },
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.875rem',
            color: '#94a3b8',
            '&.Mui-focused': { color: '#a78bfa' },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: '#94a3b8' },
        select: { color: '#f1f5f9' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: '#f1f5f9',
          '&.Mui-selected': { backgroundColor: 'rgba(139,92,246,0.15)' },
          '&:hover': { backgroundColor: 'rgba(139,92,246,0.07)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 2, fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em' },
        colorSuccess: {
          background: 'rgba(16,185,129,0.12)',
          color: '#34d399',
          border: '1px solid rgba(16,185,129,0.2)',
        },
        colorError: {
          background: 'rgba(239,68,68,0.12)',
          color: '#f87171',
          border: '1px solid rgba(239,68,68,0.2)',
        },
        colorPrimary: {
          background: 'rgba(139,92,246,0.14)',
          color: '#a78bfa',
          border: '1px solid rgba(139,92,246,0.25)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 0, fontSize: '0.875rem' },
        standardSuccess: {
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.18)',
          color: '#a7f3d0',
          '& .MuiAlert-icon': { color: '#34d399' },
        },
        standardError: {
          background: 'rgba(239,68,68,0.09)',
          border: '1px solid rgba(239,68,68,0.18)',
          color: '#fca5a5',
          '& .MuiAlert-icon': { color: '#f87171' },
        },
        standardInfo: {
          background: 'rgba(59,130,246,0.09)',
          border: '1px solid rgba(59,130,246,0.18)',
          color: '#93c5fd',
          '& .MuiAlert-icon': { color: '#60a5fa' },
        },
        standardWarning: {
          background: 'rgba(245,158,11,0.09)',
          border: '1px solid rgba(245,158,11,0.18)',
          color: '#fcd34d',
          '& .MuiAlert-icon': { color: '#fbbf24' },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(139,92,246,0.1)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: '#1a1a3e',
          border: '1px solid rgba(139,92,246,0.25)',
          fontSize: '0.78rem',
          borderRadius: 2,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
});

const TABS = [
  { label: 'Verify',   sublabel: 'Certificate',  icon: VerifiedOutlinedIcon },
  { label: 'Issue',    sublabel: 'Certificate',  icon: SchoolOutlinedIcon },
  { label: 'Certificate Lookup', sublabel: 'Browse Records', icon: BadgeOutlinedIcon },
];

function App() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>

        {/* ─── Nav ─── */}
        <AppBar position="sticky" elevation={0} sx={{
          background: 'rgba(5,5,18,0.88)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(139,92,246,0.16)',
        }}>
          <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: '64px !important', gap: 2 }}>

            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
              <Box sx={{
                width: 34, height: 34, borderRadius: '4px',
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 18px rgba(139,92,246,0.35)',
              }}>
                <VerifiedUserIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{
                  fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg, #c4b5fd, #93c5fd)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2,
                }}>
                  TrustVault
                </Typography>
                <Typography sx={{ fontSize: '0.62rem', color: '#64748b', letterSpacing: '0.07em', lineHeight: 1 }}>
                  ZERO TRUST CREDENTIALS
                </Typography>
              </Box>
            </Box>

            {/* Floating pill tabs ─ centred */}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{
                display: 'inline-flex',
                gap: '3px',
                background: 'rgba(8,8,24,0.9)',
                border: '1px solid rgba(139,92,246,0.22)',
                borderRadius: '50px',
                p: '5px',
                boxShadow: '0 2px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}>
                {TABS.map((t, i) => {
                  const Icon = t.icon;
                  const active = activeTab === i;
                  return (
                    <ButtonBase key={i} onClick={() => setActiveTab(i)} sx={{
                      borderRadius: '44px',
                      px: { xs: 1.5, sm: 2.5 },
                      py: '8px',
                      display: 'flex', alignItems: 'center', gap: 1,
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      background: active
                        ? 'linear-gradient(135deg, #6d28d9 0%, #1d4ed8 100%)'
                        : 'transparent',
                      boxShadow: active
                        ? '0 2px 18px rgba(109,40,217,0.45), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : 'none',
                      '&:hover': !active ? {
                        background: 'rgba(139,92,246,0.12)',
                      } : {},
                    }}>
                      <Icon sx={{
                        fontSize: 17,
                        color: active ? '#e9d5ff' : '#64748b',
                        transition: 'color 0.2s',
                        flexShrink: 0,
                      }} />
                      <Typography sx={{
                        fontSize: '0.82rem',
                        fontWeight: active ? 700 : 500,
                        color: active ? '#f1f5f9' : '#8394aa',
                        lineHeight: 1,
                        display: { xs: 'none', sm: 'block' },
                        whiteSpace: 'nowrap',
                      }}>
                        {t.label}
                      </Typography>
                    </ButtonBase>
                  );
                })}
              </Box>
            </Box>

            {/* Right spacer ─ balances logo width so tabs stay centred */}
            <Box sx={{ width: { xs: 0, sm: 140 }, flexShrink: 0 }} />

          </Toolbar>
        </AppBar>

        {/* ─── Content ─── */}
        <Container maxWidth="md" sx={{ pt: 3.5, pb: 8 }}>
          <Box sx={{
            background: 'rgba(8,8,24,0.84)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(139,92,246,0.18)',
            borderTop: '2px solid rgba(139,92,246,0.28)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)',
          }}>
            {activeTab === 0 && <VerificationPortal />}
            {activeTab === 1 && <UniversityPortal />}
            {activeTab === 2 && <StudentPortal />}
          </Box>

          <Box sx={{ mt: 5, textAlign: 'center' }}>
            <Typography sx={{
              fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#3d5a80', fontWeight: 500,
            }}>
              Powered by Internet Computer Protocol &nbsp;·&nbsp; Trustless &nbsp;·&nbsp; Zero Trust
            </Typography>
          </Box>
        </Container>

      </Box>
    </ThemeProvider>
  );
}

export default App;
