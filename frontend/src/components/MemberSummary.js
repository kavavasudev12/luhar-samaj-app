import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
} from "@mui/material";
import { getMembers } from "../services/api";

const MemberSummary = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await getMembers();
        setMembers(res.data);
      } catch (err) {
        console.error("❌ Failed to load members:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  // 🔹 Create summary for each household
  const summary = members.map((m) => {
    let male = 0;
    let female = 0;

    // Count head gender
    if (m.head?.gender === "male") male++;
    if (m.head?.gender === "female") female++;

    // Count family member genders
    m.familyMembers?.forEach((f) => {
      if (f.gender === "male") male++;
      if (f.gender === "female") female++;
    });

    return {
      headName: m.head?.name || "",
      zone: typeof m.zone === "object" ? m.zone.number : m.zone,
      male,
      female,
    };
  });

  // 🔹 Totals
  const totalMale = summary.reduce((sum, s) => sum + s.male, 0);
  const totalFemale = summary.reduce((sum, s) => sum + s.female, 0);
  const totalPeople = totalMale + totalFemale;

  if (loading) return <CircularProgress />;

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        સભ્ય સારાંશ રિપોર્ટ
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><b>મુખ્ય નામ</b></TableCell>
            <TableCell><b>ઝોન નંબર</b></TableCell>
            <TableCell><b>પુરુષ</b></TableCell>
            <TableCell><b>સ્ત્રી</b></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summary.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{row.headName}</TableCell>
              <TableCell>{row.zone}</TableCell>
              <TableCell>{row.male}</TableCell>
              <TableCell>{row.female}</TableCell>
            </TableRow>
          ))}

          {/* Totals Row */}
          <TableRow>
            <TableCell colSpan={2}><b>કુલ</b></TableCell>
            <TableCell><b>{totalMale}</b></TableCell>
            <TableCell><b>{totalFemale}</b></TableCell>
          </TableRow>

          {/* Final Row */}
          <TableRow>
            <TableCell colSpan={3}><b>કુલ લોકો</b></TableCell>
            <TableCell><b>{totalPeople}</b></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MemberSummary;
