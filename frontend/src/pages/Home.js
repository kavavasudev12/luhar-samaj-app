import React, { useEffect, useState } from "react";
import {
  Button,
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Paper,
} from "@mui/material";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { People, HomeWork, Map, Campaign, ArrowForward } from "@mui/icons-material";
import logo from "../assets/images/stamp1.png";
import { getPublicStats } from "../services/api";

export default function Home() {
  const [stats, setStats] = useState({ totalFamilies: 0, totalMembers: 0, totalZones: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getPublicStats();
        const data = res?.data || {};
        setStats({
          totalFamilies: data.totalFamilies || 0,
          totalMembers: data.totalMembers || 0,
          totalZones: data.totalZones || 0,
        });
      } catch (err) {
        console.error("Failed to fetch public stats:", err);
        setStats({ totalFamilies: 0, totalMembers: 0, totalZones: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);



  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 4, sm: 6 }, mb: 6, textAlign: "center" }}>
      <Helmet>
        <title>હોમ | શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા (LGS-SK)</title>
        <meta
          name="description"
          content="શ્રી સમસ્ત લુહાર સમાજ, સાવરકુંડલા (લુહાર વાડી) માં આપનું સ્વાગત છે. સભ્યોની માહિતી, નોંધણી અને સામાજિક અપડેટ્સ અહીં મેળવો."
        />
      </Helmet>

      {/* Hero Section */}
      <Box 
        sx={{ 
          mb: 8, 
          py: 6, 
          px: { xs: 2, sm: 4 }, 
          borderRadius: 6,
          background: "linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(30, 136, 229, 0.05) 100%)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(25, 118, 210, 0.1)"
        }}
      >
        <img
          src={logo}
          alt="શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા લોગો"
          style={{
            width: 130,
            marginBottom: 20,
            filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.3))",
          }}
        />

        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            fontSize: { xs: "2.2rem", sm: "3rem", md: "3.5rem" },
            textShadow: "2px 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા
        </Typography>

        <Typography
          variant="h6"
          component="h2"
          sx={{
            color: "text.secondary",
            mb: 4,
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
            fontStyle: "italic",
          }}
        >
          પરિવાર મેનેજમેન્ટ અને ડિજિટલ ઓળખપત્ર પ્લેટફોર્મ
        </Typography>

        {/* Action Buttons */}
        <Stack 
          direction={{ xs: "column", sm: "row" }} 
          spacing={3} 
          justifyContent="center" 
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/request"
            endIcon={<ArrowForward />}
            sx={{
              borderRadius: "30px",
              px: 5,
              py: 1.8,
              fontSize: "1.1rem",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #1565c0, #1e88e5)",
              boxShadow: "0 4px 12px rgba(21,101,192,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                background: "linear-gradient(135deg, #0d47a1, #1565c0)",
                transform: "translateY(-2px)",
                boxShadow: "0 6px 16px rgba(21,101,192,0.5)",
              },
            }}
          >
            નવી નોંધણી / REGISTER
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            to="/login"
            sx={{
              borderRadius: "30px",
              px: 5,
              py: 1.8,
              fontSize: "1.1rem",
              fontWeight: "bold",
              borderColor: "primary.main",
              color: "primary.main",
              borderWidth: "2px",
              transition: "all 0.3s ease",
              "&:hover": {
                borderWidth: "2px",
                background: "rgba(25, 118, 210, 0.05)",
              },
            }}
          >
            એડમિન લોગિન / LOGIN
          </Button>
        </Stack>
      </Box>

      {/* Member Statistics Section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 4, color: "text.primary" }}>
          સમાજ આંકડાકીય માહિતી (Community Statistics)
        </Typography>
        
        {loading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={4} justifyContent="center">
            {[
              { label: "કુલ કુટુંબો (Total Families)", val: stats.totalFamilies, icon: <HomeWork fontSize="large" color="primary" /> },
              { label: "કુલ સભ્યો (Total Members)", val: stats.totalMembers, icon: <People fontSize="large" color="success" /> },
              { label: "કુલ ઝોન (Total Zones)", val: stats.totalZones, icon: <Map fontSize="large" color="warning" /> },
            ].map((stat, idx) => (
              <Grid item xs={12} sm={4} key={idx}>
                <Card 
                  sx={{ 
                    borderRadius: 4, 
                    boxShadow: "0 8px 24px rgba(0,0,0,0.05)", 
                    border: "1px solid rgba(0,0,0,0.05)",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "translateY(-5px)" }
                  }}
                >
                  <CardContent sx={{ py: 4 }}>
                    <Box sx={{ display: "inline-flex", p: 2, borderRadius: "50%", bgcolor: "action.hover", mb: 2 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 800, mb: 1, color: "text.primary" }}>
                      {stat.val}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Community Intro */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          mb: 8,
          borderRadius: 4, 
          textAlign: "left", 
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.02)"
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: "primary.main" }}>
          શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}>
          અમારો હેતુ સાવરકુંડલાના સમસ્ત લુહાર સમાજને એક મંચ પર લાવીને સામાજિક, શૈક્ષણિક અને વ્યવસાયિક ઉત્કર્ષ સાધવાનો છે.
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.8 }}>
          આ ડિજિટલ પોર્ટલ દ્વારા, સમાજના દરેક કુટુંબ સરળતાથી પોતાની નોંધણી કરાવી શકે છે અને કમિટી દ્વારા ચકાસણી બાદ ડિજિટલ ઓળખપત્ર (QR કોડ યુક્ત આઈડી કાર્ડ) પ્રાપ્ત કરી શકે છે.
        </Typography>
      </Paper>

      {/* Footer */}
      <Box
        sx={{
          py: 4,
          textAlign: "center",
          background: "linear-gradient(to right, rgba(245,245,245,0.9), rgba(250,250,250,0.9))",
          borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
          mt: 4,
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          © {new Date().getFullYear()} શ્રી સમસ્ત લુહાર સમાજ, સાવરકુંડલા – ઓલ રાઇટ્સ રિઝર્વ્ડ
        </Typography>
      </Box>
    </Container>
  );
}