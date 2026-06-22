import React, { useState } from 'react';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem,
  InputBase, Badge, Tooltip, useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Dashboard as DashboardIcon, 
  People as PeopleIcon, 
  GroupAdd as GroupAddIcon,
  Map as MapIcon, 
  Notifications as NotificationsIcon,
  Search as SearchIcon, 
  Brightness4 as DarkModeIcon, 
  Brightness7 as LightModeIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Assignment as AuditIcon,
  BarChart as ReportsIcon,
  Rule as RequestsIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

export default function AdminLayout({ children, toggleColorMode, mode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const menuItems = [
    { text: 'ડેશબોર્ડ', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'સભ્યો', icon: <PeopleIcon />, path: '/members' },
    { text: 'પુખ્ત સભ્યો', icon: <GroupAddIcon />, path: '/members/adults' },
    { text: 'ઝોન', icon: <MapIcon />, path: '/zones' },
    { text: 'વિનંતીઓ', icon: <RequestsIcon />, path: '/requests' },
    { text: 'કાઢી નાખેલ સભ્યો', icon: <DeleteIcon />, path: '/members/deleted' },
    { text: 'ઓડિટ લોગ્સ', icon: <AuditIcon />, path: '/audit-logs' },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Toolbar sx={{ px: 2, display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Avatar src="/logo.svg" alt="Luhar Samaj Logo" sx={{ width: 32, height: 32 }} />
        <Typography variant="subtitle1" noWrap component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
          લુહાર સમાજ
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1.5, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                component={Link} 
                to={item.path}
                selected={isSelected}
                sx={{ 
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    }
                  },
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.light' : 'action.hover',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'inherit' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isSelected ? 600 : 500 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            sx={{ borderRadius: 2, color: 'error.main', '&:hover': { bgcolor: 'error.light', color: 'error.contrastText', '& .MuiListItemIcon-root': { color: 'error.contrastText' } } }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="લોગઆઉટ" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar / Topbar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          width: { md: `calc(100% - ${drawerWidth}px)` }, 
          ml: { md: `${drawerWidth}px` },
          boxShadow: 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Search bar */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: 'action.selected', 
            px: 2, 
            py: 0.5, 
            borderRadius: 2,
            width: { xs: '120px', sm: '250px' }
          }}>
            <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
            <InputBase 
              placeholder="શોધો..." 
              sx={{ fontSize: '0.875rem', width: '100%' }}
            />
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              <IconButton onClick={toggleColorMode} color="inherit">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={3} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Profile Menu Trigger */}
            <Tooltip title="Profile Settings">
              <IconButton onClick={handleProfileMenuOpen} size="small" sx={{ ml: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                  A
                </Avatar>
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={profileAnchor}
              open={Boolean(profileAnchor)}
              onClose={handleProfileMenuClose}
              keepMounted
              PaperProps={{ sx: { minWidth: 150, mt: 1, borderRadius: 2 } }}
            >
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>લોગઆઉટ</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer - Sidebar */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 1, borderColor: 'divider' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
