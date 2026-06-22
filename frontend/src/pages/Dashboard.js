import React, { useEffect, useState } from 'react';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';


import {
  Container, Grid, Card, CardContent, Typography,
  CircularProgress, Alert, Box, useTheme, List, ListItem, ListItemText, ListItemAvatar, Avatar, Paper
} from '@mui/material';
import {
  People as PeopleIcon,
  FamilyRestroom as FamilyIcon,
  Map as MapIcon,
  TrendingUp as TrendingUpIcon,
  Rule as RequestsIcon,
  DeleteOutline as DeleteIcon,
  History as ActivityIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { getDashboardData } from '../services/dashboardService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardData();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err.message || 'ડેશબોર્ડ ડેટા લોડ કરવામાં નિષ્ફળ');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={50} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => window.location.reload()}>ફરી પ્રયત્ન કરો</Button>
          </Box>
        </Alert>
      </Container>
    );
  }

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{
      height: '100%',
      boxShadow: theme.shadows[2],
      borderRadius: 3,
      transition: 'transform 0.3s, box-shadow 0.3s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[5]
      }
    }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box display="flex" alignItems="center" mb={1.5}>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2
            }}
          >
            {React.cloneElement(icon, {
              fontSize: 'medium',
              sx: { color: `${color}.dark` }
            })}
          </Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600 }}
            color="text.secondary"
          >
            {title}
          </Typography>
        </Box>
        <Box flexGrow={1} display="flex" alignItems="flex-end">
          <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: 700 }}
          >
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Top Header */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={4}
        gap={2}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}>
          સમાજ સંચાલન ડેશબોર્ડ
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <TrendingUpIcon color="primary" />
          <Typography variant="subtitle2" color="primary" fontWeight={600}>
            છેલ્લે અપડેટ થયેલ: આજે
          </Typography>
        </Box>
      </Box>

      {/* 6 Stats Cards Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="કુલ સભ્યો (મુખ્ય)" value={stats.totalMembers} icon={<PersonIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="પરિવારના સભ્યો" value={stats.familyMembers} icon={<FamilyIcon />} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="પુખ્ત સભ્યો (>=18)" value={stats.adultMembers} icon={<PeopleIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="ઝોન" value={stats.totalZones} icon={<MapIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="બાકી વિનંતીઓ" value={stats.pendingRequests} icon={<RequestsIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="ડિલીટ કરેલ સભ્યો" value={stats.deletedMembers} icon={<DeleteIcon />} color="error" />
        </Grid>
      </Grid>

      {/* Analytics Charts Grid */}
      <Grid container spacing={3} mb={4}>
        {/* Members By Zone Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: theme.shadows[1], borderRadius: 3, p: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>ઝોન પ્રમાણે વિતરણ</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.zoneDistribution || []}>
                <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                <YAxis stroke={theme.palette.text.secondary} />
                <Tooltip />
                <Bar dataKey="totalPeople" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} name="કુલ વસ્તી" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Age Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: theme.shadows[1], borderRadius: 3, p: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>ઉંમર જૂથ વિતરણ (Age Distribution)</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.ageDistribution || []}>
                <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                <YAxis stroke={theme.palette.text.secondary} />
                <Tooltip />
                <Bar dataKey="count" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} name="સભ્યો" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
