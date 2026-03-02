import { useState } from 'react';
import { credential_backend } from 'declarations/credential_backend';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const SectionLabel = ({ children }) => (
  <Typography sx={{
    fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#94a3b8', mb: 0.6,
  }}>
    {children}
  </Typography>
);

const DataField = ({ label, value, mono = false }) => (
  <Box>
    <SectionLabel>{label}</SectionLabel>
    <Typography sx={{
      fontSize: mono ? '0.75rem' : '0.875rem',
      fontWeight: mono ? 400 : 600,
      color: mono ? '#94a3b8' : '#e2e8f0',
      fontFamily: mono ? '"JetBrains Mono","Fira Code",monospace' : 'inherit',
      wordBreak: 'break-all',
      lineHeight: 1.5,
    }}>
      {value}
    </Typography>
  </Box>
);

function StudentPortal() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(null);

  const searchCertificates = async () => {
    if (!studentId.trim()) {
      setMessage({ type: 'warning', text: 'Please enter a student ID' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    setCertificates([]);
    try {
      const results = await credential_backend.getCertificatesByStudent(studentId);
      if (results.length === 0) {
        setMessage({ type: 'info', text: 'No certificates found for this student ID' });
      } else {
        setCertificates(results);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = (cert) => {
    const data = {
      certificate_id: cert.certificate_id, issuer: cert.issuer,
      recipient: cert.recipient, credential: cert.credential,
      certificate_hash: cert.certificate_hash, issuer_signature: cert.issuer_signature,
      is_revoked: cert.is_revoked, block_timestamp: cert.block_timestamp.toString(),
      schema_version: cert.schema_version,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${cert.certificate_id}.json`;
    link.click(); URL.revokeObjectURL(url);
  };

  const copyCertificateId = (certId) => {
    navigator.clipboard.writeText(certId);
    setCopied(certId);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Box sx={{ px: { xs: 3, sm: 4 }, py: 3.5 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 0.25 }}>
          My Certificates
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Look up all certificates issued to a student ID
        </Typography>
      </Box>

      {/* ── Search ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <TextField
          fullWidth size="small"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchCertificates()}
          placeholder="Enter Student ID (e.g., 20210001)"
          disabled={loading}
          sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
        />
        <Button
          variant="contained"
          onClick={searchCertificates}
          disabled={loading || !studentId.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon sx={{ fontSize: 18 }} />}
          sx={{ minWidth: 110, height: 44, flexShrink: 0 }}
        >
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </Box>

      {/* ── Message ────────────────────────────────────────── */}
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2.5 }}>{message.text}</Alert>
      )}

      {/* ── Results ────────────────────────────────────────── */}
      {certificates.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
              {certificates.length} certificate{certificates.length > 1 ? 's' : ''} found
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {certificates.map((cert, index) => (
              <Box key={index} sx={{
                borderRadius: 0,
                border: cert.is_revoked
                  ? '1px solid rgba(239,68,68,0.2)'
                  : '1px solid rgba(139,92,246,0.14)',
                borderLeft: cert.is_revoked
                  ? '3px solid rgba(239,68,68,0.6)'
                  : '3px solid rgba(139,92,246,0.5)',
                overflow: 'hidden',
                background: '#0d0d20',
              }}>
                {/* Card header */}
                <Box sx={{
                  px: 3, py: 1.75,
                  borderBottom: '1px solid rgba(139,92,246,0.08)',
                  background: cert.is_revoked
                    ? 'rgba(239,68,68,0.05)'
                    : 'rgba(139,92,246,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    {cert.is_revoked
                      ? <ErrorOutlineIcon sx={{ fontSize: 17, color: '#f87171' }} />
                      : <VerifiedOutlinedIcon sx={{ fontSize: 17, color: '#8b5cf6' }} />
                    }
                    <Box>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>
                        {cert.credential.degree_type}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#8394aa', lineHeight: 1.3 }}>
                        {cert.credential.major} &nbsp;·&nbsp; {cert.issuer.name}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={cert.is_revoked ? 'REVOKED' : 'VERIFIED'}
                      color={cert.is_revoked ? 'error' : 'success'}
                      size="small"
                    />
                    <Tooltip title={copied === cert.certificate_id ? 'Copied!' : 'Copy ID'}>
                      <IconButton
                        size="small"
                        onClick={() => copyCertificateId(cert.certificate_id)}
                        sx={{
                          width: 30, height: 30, borderRadius: '50%',
                          border: '1px solid rgba(139,92,246,0.25)',
                          color: copied === cert.certificate_id ? '#34d399' : '#8b5cf6',
                        }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download JSON">
                      <IconButton
                        size="small"
                        onClick={() => downloadCertificate(cert)}
                        sx={{
                          width: 30, height: 30, borderRadius: '50%',
                          border: '1px solid rgba(139,92,246,0.25)',
                          color: '#8b5cf6',
                        }}
                      >
                        <DownloadIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Card body */}
                <Box sx={{ px: 3, py: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <DataField label="Student Name" value={cert.recipient.name} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <DataField label="Student ID" value={cert.recipient.student_id} />
                    </Grid>
                    <Grid item xs={4}>
                      <DataField label="GPA" value={cert.credential.gpa.toFixed(2)} />
                    </Grid>
                    <Grid item xs={4}>
                      <DataField label="Honors" value={cert.credential.honors || '—'} />
                    </Grid>
                    <Grid item xs={4}>
                      <DataField label="Graduated" value={cert.credential.graduation_date} />
                    </Grid>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <DataField label="Certificate ID" value={cert.certificate_id} mono />
                    </Grid>
                    <Grid item xs={12}>
                      <DataField label="Certificate Hash" value={cert.certificate_hash} mono />
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Empty hint ─────────────────────────────────────── */}
      {certificates.length === 0 && !loading && !message.text && (
        <Box sx={{
          mt: 1, px: 2.5, py: 1.75, borderRadius: 0,
          background: 'rgba(139,92,246,0.04)',
          border: '1px solid rgba(139,92,246,0.09)',
          borderLeft: '3px solid rgba(139,92,246,0.2)',
        }}>
          <Typography sx={{ fontSize: '0.78rem', color: '#8394aa', lineHeight: 1.75 }}>
            <Box component="span" sx={{ color: '#94a3b8', fontWeight: 700 }}>Note: </Box>
            All certificates are permanently stored on-chain with a unique cryptographic hash.
            Download the JSON and use the Verify tab to validate authenticity independently.
          </Typography>
        </Box>
      )}

    </Box>
  );
}

export default StudentPortal;
