import { useState } from 'react';
import { credential_backend } from 'declarations/credential_backend';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonIcon from '@mui/icons-material/Person';

function StudentPortal() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

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
        setMessage({ type: 'success', text: `Found ${results.length} certificate(s)` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = (cert) => {
    const certificateData = {
      certificate_id: cert.certificate_id,
      issuer: cert.issuer,
      recipient: cert.recipient,
      credential: cert.credential,
      certificate_hash: cert.certificate_hash,
      issuer_signature: cert.issuer_signature,
      is_revoked: cert.is_revoked,
      block_timestamp: cert.block_timestamp.toString(),
      schema_version: cert.schema_version
    };

    const dataStr = JSON.stringify(certificateData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cert.certificate_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyCertificateId = (certId) => {
    navigator.clipboard.writeText(certId);
    setMessage({ type: 'info', text: `Certificate ID copied: ${certId}` });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="700" sx={{ color: 'text.primary' }}>
          My Certificates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
          View all certificates issued to a student
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <TextField
          fullWidth
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchCertificates()}
          placeholder="Enter Student ID (e.g., 20210001)"
          variant="outlined"
          disabled={loading}
        />
        <Button 
          variant="contained"
          onClick={searchCertificates}
          disabled={loading || !studentId.trim()}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
          sx={{ minWidth: 140, px: 3 }}
        >
          {loading ? 'Searching' : 'Search'}
        </Button>
      </Box>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {certificates.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mt: 3, mb: 3 }}>
            {certificates.length} Certificate{certificates.length > 1 ? 's' : ''} Found
          </Typography>
          <Grid container spacing={3}>
            {certificates.map((cert, index) => (
              <Grid item xs={12} key={index}>
                <Card elevation={1} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom fontWeight="600">
                          {cert.credential.degree_type}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          {cert.credential.major}
                        </Typography>
                        <Typography variant="subtitle2" color="primary.main" fontWeight="600" sx={{ mt: 1 }}>
                          {cert.issuer.name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={cert.is_revoked ? 'REVOKED' : 'VERIFIED'} 
                        color={cert.is_revoked ? 'error' : 'success'}
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" fontWeight="500" textTransform="uppercase" letterSpacing="0.5px">Certificate ID</Typography>
                        <Typography variant="body2" fontFamily="monospace" sx={{ mt: 0.5 }}>
                          {cert.certificate_id}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="500" textTransform="uppercase" letterSpacing="0.5px">Student Name</Typography>
                        <Typography variant="body1" fontWeight="600" sx={{ mt: 0.5 }}>{cert.recipient.name}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="500" textTransform="uppercase" letterSpacing="0.5px">Student ID</Typography>
                        <Typography variant="body1" fontWeight="600" sx={{ mt: 0.5 }}>{cert.recipient.student_id}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" fontWeight="500" textTransform="uppercase" letterSpacing="0.5px">GPA</Typography>
                        <Typography variant="body1" fontWeight="600" sx={{ mt: 0.5 }}>{cert.credential.gpa.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" fontWeight="500" textTransform="uppercase" letterSpacing="0.5px">Honors</Typography>
                        <Typography variant="body1" fontWeight="600" sx={{ mt: 0.5 }}>{cert.credential.honors || 'None'}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" fontWeight="500" textTransform="uppercase" letterSpacing="0.5px">Graduated</Typography>
                        <Typography variant="body1" fontWeight="600" sx={{ mt: 0.5 }}>{cert.credential.graduation_date}</Typography>
                      </Grid>
                    </Grid>

                    <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.50', borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="500" textTransform="uppercase" letterSpacing="0.5px">Certificate Hash</Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all', fontSize: '0.8rem', mt: 1, color: 'text.secondary' }}>
                        {cert.certificate_hash}
                      </Typography>
                    </Paper>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 2.5, pt: 0 }}>
                    <Button
                      size="medium"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyCertificateId(cert.certificate_id)}
                      sx={{ fontWeight: 500 }}
                    >
                      Copy ID
                    </Button>
                    <Button
                      size="medium"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadCertificate(cert)}
                      sx={{ fontWeight: 500 }}
                    >
                      Download
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Paper sx={{ p: 3, mt: 4, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100', borderRadius: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="600" color="primary.dark">
          About Certificates
        </Typography>
        <Box component="ul" sx={{ pl: 2.5, mt: 1.5, mb: 0, '& li': { mb: 1, fontSize: '0.9rem', color: 'text.secondary' } }}>
          <Typography component="li">
            All certificates permanently stored on blockchain
          </Typography>
          <Typography component="li">
            Download and share with employers or institutions
          </Typography>
          <Typography component="li">
            Each certificate has unique cryptographic hash
          </Typography>
          <Typography component="li">
            Use "Verify Certificate" tab to validate authenticity
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default StudentPortal;
