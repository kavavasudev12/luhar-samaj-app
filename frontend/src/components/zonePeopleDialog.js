import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
} from "@mui/material";

const ZonePeopleDialog = ({ open, onClose, zoneName, loading, people, error }) => {
  // 🔹 Group people by head and compute counts
  const { families, totals } = useMemo(() => {
    if (!Array.isArray(people) || people.length === 0) {
      return { families: [], totals: { male: 0, female: 0, total: 0 } };
    }

    // Group by head (isHead === true or fallback to headName field)
    const headMap = new Map();

    people.forEach((p) => {
      if (p.isHead) {
        headMap.set(p._id, {
          headId: p._id,
          headName: p.name || "—",
          headGender: p.gender || "—",
          members: [],
        });
      }
    });

    // If no explicit heads, fallback: group by headName property if present
    if (headMap.size === 0) {
      people.forEach((p) => {
        if (p.headName) {
          if (!headMap.has(p.headName)) {
            headMap.set(p.headName, {
              headId: null,
              headName: p.headName,
              headGender: p.headGender || "—",
              members: [],
            });
          }
        }
      });
    }

    // If still no head info, put everyone under one family
    if (headMap.size === 0) {
      headMap.set("__ALL__", {
        headId: "__ALL__",
        headName: "અજ્ઞાત પરિવાર",
        headGender: "—",
        members: [],
      });
    }

    // Assign members to families
    people.forEach((p) => {
      let key = null;

      // Try to link by headId if available
      if (p.headId && headMap.has(p.headId)) {
        key = p.headId;
      }
      // Or by headName string
      else if (p.headName && headMap.has(p.headName)) {
        key = p.headName;
      }
      // Or if person itself is head
      else if (p.isHead && headMap.has(p._id)) {
        key = p._id;
      }
      // Fallback: put into the only group available
      else if (headMap.size === 1) {
        key = Array.from(headMap.keys())[0];
      }

      if (key) {
        headMap.get(key).members.push(p);
      }
    });

    // Compute counts
    const families = Array.from(headMap.values()).map((f) => {
      const male = f.members.filter((m) => String(m.gender).toLowerCase().startsWith("m")).length;
      const female = f.members.filter((m) => String(m.gender).toLowerCase().startsWith("f")).length;
      const total = f.members.length;
      return {
        headName: f.headName,
        headGender: f.headGender,
        male,
        female,
        total,
      };
    });

    const totals = families.reduce(
      (acc, f) => ({
        male: acc.male + f.male,
        female: acc.female + f.female,
        total: acc.total + f.total,
      }),
      { male: 0, female: 0, total: 0 }
    );

    return { families, totals };
  }, [people]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>ઝોન: {zoneName} - પરિવારગત સભ્યો</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : families.length === 0 ? (
          <Typography>કોઈ સભ્ય નથી</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>મુખિયાનું નામ</TableCell>
                <TableCell>મુખિયાનો લિંગ</TableCell>
                <TableCell>પુરુષ</TableCell>
                <TableCell>સ્ત્રી</TableCell>
                <TableCell>કુલ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {families.map((f, idx) => (
                <TableRow key={idx}>
                  <TableCell>{f.headName}</TableCell>
                  <TableCell>{f.headGender}</TableCell>
                  <TableCell>{f.male}</TableCell>
                  <TableCell>{f.female}</TableCell>
                  <TableCell>{f.total}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} style={{ fontWeight: "bold" }}>
                  કુલ
                </TableCell>
                <TableCell style={{ fontWeight: "bold" }}>{totals.male}</TableCell>
                <TableCell style={{ fontWeight: "bold" }}>{totals.female}</TableCell>
                <TableCell style={{ fontWeight: "bold" }}>{totals.total}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          બંધ કરો
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ZonePeopleDialog;
