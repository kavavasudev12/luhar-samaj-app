// src/services/memberService.js
import api from './api';

// 🔧 Normalize family members so that `age` is always a string
const normalizeMember = (member) => ({
  ...member,
  familyMembers: member.familyMembers?.map(f => ({
    ...f,
    age: String(f.age ?? '') // force to string
  })) || []
});

// Get all (active) members
export const getMembers = async () => {
  try {
    const response = await api.get('/members');
    const normalized = response.data.map(normalizeMember);
    return normalized;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error fetching active members:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to fetch members';
  }
};

// ✅ --- NEW FUNCTION ---
// Get all deleted members
export const getDeletedMembers = async () => {
  try {
    const response = await api.get('/members/deleted');
    const normalized = response.data.map(normalizeMember);
    return normalized;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error fetching deleted members:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to fetch deleted members';
  }
};


// Get single member by ID (useful for edit forms)
// Note: This will not find deleted members unless API is changed
export const getMemberById = async (id) => {
  try {
    const response = await api.get(`/members/${id}`); // This route might need logic if you want to edit deleted members, but for now it's ok.
    const normalized = normalizeMember(response.data);
    return normalized;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error fetching member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to fetch member';
  }
};

// Create member
export const createMember = async (memberData) => {
  try {
    const response = await api.post('/members', memberData);
    const normalized = normalizeMember(response.data.member); // ✅ Data is nested under 'member'
    return normalized;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error creating member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to create member';
  }
};

// Update member
export const updateMember = async (id, memberData) => {
  try {
    const response = await api.put(`/members/${id}`, memberData);
    const normalized = normalizeMember(response.data.member); // ✅ Data is nested under 'member'
    return normalized;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error updating member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to update member';
  }
};

// Delete member (now soft delete)
export const deleteMember = async (id) => {
  try {
    await api.delete(`/members/${id}`);
  } catch (error) {
    console.error(
      '❌ [MemberService] Error soft deleting member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to delete member';
  }
};

// Restore a soft-deleted member
export const restoreMember = async (id, data) => {
  try {
    await api.put(`/members/${id}/restore`, data);
  } catch (error) {
    console.error(
      '❌ [MemberService] Error restoring member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to restore member';
  }
};

// Permanent delete a soft-deleted member
export const permanentDeleteMember = async (id) => {
  try {
    await api.delete(`/members/${id}/permanent`);
  } catch (error) {
    console.error(
      '❌ [MemberService] Error permanently deleting member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to permanently delete member';
  }
};

// Generate member card PDF
export const generateMemberCardPDF = async (id) => {
  try {
    const response = await api.get(`/members/${id}/pdf`, {
      responseType: 'blob'
    });
    return new Blob([response.data], { type: 'application/pdf' });
  } catch (error) {
    console.error(
      '❌ [MemberService] Error generating PDF:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to generate PDF';
  }
};