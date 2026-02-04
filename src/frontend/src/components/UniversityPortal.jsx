import { useState } from 'react';
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
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SendIcon from '@mui/icons-material/Send';

function UniversityPortal() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [universityName, setUniversityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [certificateForm, setCertificateForm] = useState({
    certificateId: '',
    universityName: '',
    verificationUrl: '',
    recipientName: '',
    studentId: '',
    recipientPrincipal: '',
    degreeType: '',
    major: '',
    graduationDate: '',
    issueDate: '',
    gpa: '',
    honors: ''
  });

  const handleRegister = async () => {
    if (!universityName.trim()) {
      setMessage({ type: 'error', text: 'Please enter university name' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await credential_backend.registerUniversity(universityName);
      if (result) {
        setIsRegistered(true);
        setMessage({ type: 'success', text: `Successfully registered as ${universityName}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCertificateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleIssueCertificate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await credential_backend.issueCertificate(
        certificateForm.certificateId,
        certificateForm.universityName,
        certificateForm.verificationUrl || window.location.origin,
        certificateForm.recipientName,
        certificateForm.studentId,
        certificateForm.recipientPrincipal || 'anonymous',
        certificateForm.degreeType,
        certificateForm.major,
        certificateForm.graduationDate,
        certificateForm.issueDate,
        parseFloat(certificateForm.gpa) || 0.0,
        certificateForm.honors
      );

      if (result.includes('Error')) {
        setMessage({ type: 'error', text: result });
      } else {
        setMessage({ type: 'success', text: `Certificate issued successfully! ID: ${result}` });
        setCertificateForm({
          certificateId: '',
          universityName: certificateForm.universityName,
          verificationUrl: certificateForm.verificationUrl,
          recipientName: '',
          studentId: '',
          recipientPrincipal: '',
          degreeType: '',
          major: '',
          graduationDate: '',
          issueDate: '',
          gpa: '',
          honors: ''
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateCertificateId = () => {
    const prefix = 'CERT';
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 15).toUpperCase();
    const id = `${prefix}-${year}-MIT-CS-${random}`;
    setCertificateForm(prev => ({ ...prev, certificateId: id }));
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="700" sx={{ color: 'text.primary' }}>
          Issue Certificate
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
          Create blockchain-verified academic credentials
        </Typography>
      </Box>

      {!isRegistered ? (
        <Paper sx={{ p: 4, borderRadius: 2 }} elevation={1}>
          <Typography variant="h6" gutterBottom fontWeight="600">Register Institution</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Register your institution to start issuing certificates
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <TextField
              fullWidth
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              placeholder="Massachusetts Institute of Technology"
              variant="outlined"
              disabled={loading}
            />
            <Button 
              variant="contained" 
              onClick={handleRegister}
              disabled={loading}
              sx={{ minWidth: 140, px: 3 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, borderRadius: 2 }} elevation={1}>
          <Typography variant="h6" gutterBottom fontWeight="600">Certificate Information</Typography>
          <Divider sx={{ mb: 4 }} />
          
          <Box component="form" onSubmit={handleIssueCertificate}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    name="certificateId"
                    label="Certificate ID"
                    value={certificateForm.certificateId}
                    onChange={handleInputChange}
                    placeholder="CERT-2024-MIT-CS-001234"
                    required
                  />
                  <Tooltip title="Generate ID">
                    <IconButton 
                      color="primary" 
                      onClick={generateCertificateId}
                      sx={{ border: 1, borderColor: 'primary.main' }}
                    >
                      <AutoFixHighIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="universityName"
                  label="University Name"
                  value={certificateForm.universityName}
                  onChange={handleInputChange}
                  placeholder="Massachusetts Institute of Technology"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="verificationUrl"
                  label="Verification URL (Optional)"
                  value={certificateForm.verificationUrl}
                  onChange={handleInputChange}
                  placeholder="https://ic0.app/canister/..."
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="recipientName"
                  label="Student Name"
                  value={certificateForm.recipientName}
                  onChange={handleInputChange}
                  placeholder="Alice Johnson"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="studentId"
                  label="Student ID"
                  value={certificateForm.studentId}
                  onChange={handleInputChange}
                  placeholder="20210001"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  name="degreeType"
                  label="Degree Type"
                  value={certificateForm.degreeType}
                  onChange={handleInputChange}
                  required
                >
                  <MenuItem value="">Select Degree</MenuItem>
                  <MenuItem value="Bachelor of Science">Bachelor of Science</MenuItem>
                  <MenuItem value="Bachelor of Arts">Bachelor of Arts</MenuItem>
                  <MenuItem value="Master of Science">Master of Science</MenuItem>
                  <MenuItem value="Master of Arts">Master of Arts</MenuItem>
                  <MenuItem value="Doctor of Philosophy">Doctor of Philosophy</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="major"
                  label="Major"
                  value={certificateForm.major}
                  onChange={handleInputChange}
                  placeholder="Computer Science"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  name="graduationDate"
                  label="Graduation Date"
                  value={certificateForm.graduationDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  name="issueDate"
                  label="Issue Date"
                  value={certificateForm.issueDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="gpa"
                  label="GPA"
                  value={certificateForm.gpa}
                  onChange={handleInputChange}
                  placeholder="3.85"
                  inputProps={{ step: 0.01, min: 0, max: 4 }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  name="honors"
                  label="Honors"
                  value={certificateForm.honors}
                  onChange={handleInputChange}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Cum Laude">Cum Laude</MenuItem>
                  <MenuItem value="Magna Cum Laude">Magna Cum Laude</MenuItem>
                  <MenuItem value="Summa Cum Laude">Summa Cum Laude</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Button 
                  fullWidth
                  type="submit" 
                  variant="contained" 
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  sx={{ mt: 3, py: 1.5, fontSize: '1rem', fontWeight: 600 }}
                >
                  {loading ? 'Issuing on Blockchain...' : 'Issue Certificate'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {message.text && (
        <Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}
    </Box>
  );
}

export default UniversityPortal;
