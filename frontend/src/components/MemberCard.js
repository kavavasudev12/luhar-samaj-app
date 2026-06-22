import React from 'react';
import { Card, CardContent, Typography, Button, CardActions, CircularProgress } from '@mui/material';
import { Description, Edit, Delete } from '@mui/icons-material';

const MemberCard = ({ member, onGenerateCard, onEdit, onDelete, isGenerating }) => {
  // ✅ Add +1 to include Head as a family member
  const totalFamily = (member.familyMembers?.length || 0) + 1;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h5" component="div" gutterBottom>
          {member.head?.name}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          <strong>Ration No:</strong> {member.rationNo}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          <strong>Zone:</strong> {member.zone?.number} - {member.zone?.name}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Address:</strong> {member.address}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Mobile:</strong> {member.mobile || 'N/A'}
        </Typography>
        <Typography variant="body2">
          <strong>Family Members:</strong> {totalFamily}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'center' }}>
        <Button 
          size="small" 
          startIcon={isGenerating ? <CircularProgress size={14} /> : <Description />} 
          onClick={onGenerateCard}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'PDF'}
        </Button>
        <Button 
          size="small" 
          startIcon={<Edit />} 
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button 
          size="small" 
          startIcon={<Delete />} 
          onClick={onDelete}
          color="error"
        >
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};

export default MemberCard;
