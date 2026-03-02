import { useState, useEffect } from 'react';
import { credential_backend } from 'declarations/credential_backend';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  InputAdornment,
} from '@mui/material';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LogoutIcon from '@mui/icons-material/Logout';
import SendIcon from '@mui/icons-material/Send';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// Convert an institution name to a URL-safe slug
const toSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const SectionLabel = ({ children }) => (
  <Typography sx={{
    fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#94a3b8', mb: 0.6,
  }}>
    {children}
  </Typography>
);

const Field = ({ name, label, required, value, onChange, ...props }) => (
  <Box>
    <SectionLabel>{label}{required && ' *'}</SectionLabel>
    <TextField
      fullWidth size="small"
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      {...props}
    />
  </Box>
);

function UniversityPortal() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [universityName, setUniversityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [issuedCertUrl, setIssuedCertUrl] = useState('');

  const [certificateForm, setCertificateForm] = useState({
    certificateId: '', universityName: '',
    recipientName: '', studentId: '', recipientPrincipal: '',
    degreeType: '', major: '', graduationDate: '', issueDate: '',
    gpa: '', honors: '',
  });

  useEffect(() => {
    try {
      const storedRegistered = window.localStorage.getItem('cv_university_isRegistered');
      const storedName = window.localStorage.getItem('cv_university_name');
      if (storedRegistered === 'true' && storedName) {
        setIsRegistered(true);
        setUniversityName(storedName);
        setCertificateForm(prev => ({ ...prev, universityName: storedName }));
      }
    } catch { /* ignore */ }
  }, []);

  const handleRegister = async () => {
    if (!universityName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a university name' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await credential_backend.registerUniversity(universityName);
      if (result) {
        setIsRegistered(true);
        setMessage({ type: 'success', text: `Registered as ${universityName}` });
        try {
          window.localStorage.setItem('cv_university_isRegistered', 'true');
          window.localStorage.setItem('cv_university_name', universityName);
        } catch { /* ignore */ }
        setCertificateForm(prev => ({ ...prev, universityName }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsRegistered(false);
    setUniversityName('');
    setCertificateForm(prev => ({ ...prev, universityName: '' }));
    try {
      window.localStorage.removeItem('cv_university_isRegistered');
      window.localStorage.removeItem('cv_university_name');
    } catch { /* ignore */ }
    setMessage({ type: 'info', text: 'Logged out. Register a new institution to continue.' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCertificateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleIssueCertificate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setIssuedCertUrl('');
    try {
      // Auto-compute a canonical verification URL — no custom URL option
      const univSlug = toSlug(certificateForm.universityName);
      const batchYear = certificateForm.graduationDate
        ? certificateForm.graduationDate.split('-')[0]
        : new Date().getFullYear().toString();
      const certId = certificateForm.certificateId;
      const verificationUrl =
        `${window.location.origin}/#/verify/${univSlug}/${batchYear}/${encodeURIComponent(certId)}`;

      const result = await credential_backend.issueCertificate(
        certId, certificateForm.universityName,
        verificationUrl,
        certificateForm.recipientName, certificateForm.studentId,
        certificateForm.recipientPrincipal || 'anonymous',
        certificateForm.degreeType, certificateForm.major,
        certificateForm.graduationDate, certificateForm.issueDate,
        parseFloat(certificateForm.gpa) || 0.0, certificateForm.honors,
      );
      if (result.includes('Error')) {
        setMessage({ type: 'error', text: result });
      } else {
        setIssuedCertUrl(verificationUrl);
        setMessage({ type: 'success', text: `Certificate issued on-chain — ID: ${result}` });
        setCertificateForm(prev => ({
          ...prev,
          certificateId: '', recipientName: '', studentId: '',
          recipientPrincipal: '', degreeType: '', major: '',
          graduationDate: '', issueDate: '', gpa: '', honors: '',
        }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateCertificateId = () => {
    const year = new Date().getFullYear();
    // Include a short slug from the university name so IDs are human-readable
    const slug = toSlug(universityName)
      .split('-')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w.slice(0, 3).toUpperCase())
      .join('-');
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    const id = slug ? `${year}-${slug}-${random}` : `${year}-${random}`;
    setCertificateForm(prev => ({ ...prev, certificateId: id }));
  };

  return (
    <Box sx={{ px: { xs: 3, sm: 4 }, py: 3.5 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 0.25 }}>
          Issue Certificate
        </Typography>

      </Box>

      {/* ── Register gate ──────────────────────────────────── */}
      {!isRegistered ? (
        <Box sx={{
          p: 3, borderRadius: 0,
          background: 'rgba(139,92,246,0.05)',
          border: '1px solid rgba(139,92,246,0.14)',
          borderLeft: '3px solid rgba(139,92,246,0.4)',
        }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#c4b5fd', mb: 0.5 }}>
            Register Institution
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', mb: 2.5 }}>
            Enter your institution name to activate certificate issuance
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth size="small"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
              placeholder="Massachusetts Institute of Technology"
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleRegister}
              disabled={loading}
              sx={{ minWidth: 110, height: 40, flexShrink: 0 }}
            >
              {loading ? <CircularProgress size={16} color="inherit" /> : 'Register'}
            </Button>
          </Box>
          {message.text && (
            <Alert severity={message.type} sx={{ mt: 2 }}>{message.text}</Alert>
          )}
        </Box>
      ) : (
        <Box component="form" onSubmit={handleIssueCertificate}>

          {/* ── Institution badge ───────────────────────────── */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2.5, py: 1.5, mb: 3, borderRadius: 0,
            background: 'rgba(139,92,246,0.06)',
            border: '1px solid rgba(139,92,246,0.14)',
            borderLeft: '3px solid rgba(139,92,246,0.5)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <SchoolOutlinedIcon sx={{ fontSize: 17, color: '#8b5cf6' }} />
              <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Issuing as{' '}
                <Box component="span" sx={{ color: '#c4b5fd', fontWeight: 600 }}>
                  {universityName}
                </Box>
              </Typography>
              <Chip label="ACTIVE" color="success" size="small" />
            </Box>
            <Tooltip title="Switch institution">
              <Button
                variant="text" size="small" color="error"
                onClick={handleLogout}
                startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
                sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5, minWidth: 0 }}
              >
                Logout
              </Button>
            </Tooltip>
          </Box>

          {/* ── Certificate ID ─────────────────────────────── */}
          <Box sx={{ mb: 3 }}>
            <SectionLabel>Certificate ID *</SectionLabel>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth size="small"
                name="certificateId"
                value={certificateForm.certificateId}
                onChange={handleInputChange}
                placeholder="CERT-2026-MIT-CS-001234"
                required
              />
              <Tooltip title="Auto-generate ID">
                <IconButton
                  onClick={generateCertificateId}
                  sx={{
                    width: 40, height: 40, flexShrink: 0,
                    border: '1px solid rgba(139,92,246,0.35)',
                    color: '#8b5cf6',
                    borderRadius: '50%',
                    '&:hover': {
                      border: '1px solid rgba(139,92,246,0.7)',
                      background: 'rgba(139,92,246,0.1)',
                    },
                  }}
                >
                  <AutoFixHighIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* ── Institution ────────────────────────────────── */}
          <Box sx={{
            pb: 2.5, mb: 2.5,
            borderBottom: '1px solid rgba(139,92,246,0.08)',
          }}>
            <Typography sx={{
              fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#8394aa', mb: 1.5,
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Box sx={{ width: 2, height: 14, borderRadius: 1, background: '#7c3aed', display: 'inline-block' }} />
              Institution
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box>
                  <SectionLabel>University Name *</SectionLabel>
                  <TextField
                    fullWidth size="small"
                    value={certificateForm.universityName}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <LockOutlinedIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(139,92,246,0.06)',
                        '& input': { color: '#a78bfa', fontWeight: 600, cursor: 'default' },
                        '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' },
                      },
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* ── Recipient ──────────────────────────────────── */}
          <Box sx={{
            pb: 2.5, mb: 2.5,
            borderBottom: '1px solid rgba(139,92,246,0.08)',
          }}>
            <Typography sx={{
              fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#8394aa', mb: 1.5,
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Box sx={{ width: 2, height: 14, borderRadius: 1, background: '#2563eb', display: 'inline-block' }} />
              Recipient
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Field name="recipientName" label="Student Name" required value={certificateForm.recipientName} onChange={handleInputChange} placeholder="Alice Johnson" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field name="studentId" label="Student ID" required value={certificateForm.studentId} onChange={handleInputChange} placeholder="20210001" />
              </Grid>
            </Grid>
          </Box>

          {/* ── Credential ─────────────────────────────────── */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{
              fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#8394aa', mb: 1.5,
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Box sx={{ width: 2, height: 14, borderRadius: 1, background: '#059669', display: 'inline-block' }} />
              Credential
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <SectionLabel>Degree Type *</SectionLabel>
                  <TextField select fullWidth size="small" name="degreeType"
                    value={certificateForm.degreeType} onChange={handleInputChange} required>
                    <MenuItem value="">Select degree</MenuItem>
                    <MenuItem value="Bachelor of Science">Bachelor of Science</MenuItem>
                    <MenuItem value="Bachelor of Arts">Bachelor of Arts</MenuItem>
                    <MenuItem value="Master of Science">Master of Science</MenuItem>
                    <MenuItem value="Master of Arts">Master of Arts</MenuItem>
                    <MenuItem value="Doctor of Philosophy">Doctor of Philosophy</MenuItem>
                  </TextField>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field name="major" label="Major" required value={certificateForm.major} onChange={handleInputChange} placeholder="Computer Science" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box>
                  <SectionLabel>Graduation Date *</SectionLabel>
                  <TextField fullWidth size="small" type="date" name="graduationDate"
                    value={certificateForm.graduationDate} onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }} required />
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box>
                  <SectionLabel>Issue Date *</SectionLabel>
                  <TextField fullWidth size="small" type="date" name="issueDate"
                    value={certificateForm.issueDate} onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }} required />
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Field name="gpa" label="GPA *" required value={certificateForm.gpa} onChange={handleInputChange} placeholder="3.85"
                  type="number" inputProps={{ step: 0.01, min: 0, max: 4 }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box>
                  <SectionLabel>Honors</SectionLabel>
                  <TextField select fullWidth size="small" name="honors"
                    value={certificateForm.honors} onChange={handleInputChange}>
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="Cum Laude">Cum Laude</MenuItem>
                    <MenuItem value="Magna Cum Laude">Magna Cum Laude</MenuItem>
                    <MenuItem value="Summa Cum Laude">Summa Cum Laude</MenuItem>
                  </TextField>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* ── Result ─────────────────────────────────────── */}
          {message.text && (
            <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>
          )}

          {/* Shareable verification link — shown after successful issuance */}
          {issuedCertUrl && (
            <Box sx={{
              mb: 2, p: 2, borderRadius: 0,
              background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.18)',
              borderLeft: '3px solid rgba(16,185,129,0.5)',
            }}>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: '#34d399', mb: 0.75, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Shareable Verification Link
              </Typography>
              <Typography sx={{ fontSize: '0.73rem', color: '#94a3b8', mb: 1.25 }}>
                Share this link with anyone who needs to verify this certificate. Opening it auto-verifies instantly.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth size="small"
                  value={issuedCertUrl}
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: '"JetBrains Mono","Fira Code",monospace',
                      fontSize: '0.72rem',
                      background: 'rgba(0,0,0,0.3)',
                      '& input': { color: '#6ee7b7' },
                      '& fieldset': { borderColor: 'rgba(16,185,129,0.25)' },
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigator.clipboard.writeText(issuedCertUrl)}
                  sx={{
                    minWidth: 64, height: 40, flexShrink: 0,
                    borderColor: 'rgba(16,185,129,0.4)',
                    color: '#34d399',
                    '&:hover': { borderColor: '#34d399', background: 'rgba(16,185,129,0.1)' },
                  }}
                >
                  Copy
                </Button>
              </Box>
            </Box>
          )}

          <Button
            fullWidth type="submit" variant="contained" disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon sx={{ fontSize: 17 }} />}
            sx={{ py: 1.25, fontSize: '0.875rem' }}
          >
            {loading ? 'Issuing on Blockchain…' : 'Issue Certificate'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default UniversityPortal;
