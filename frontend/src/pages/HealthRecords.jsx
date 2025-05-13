import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus, FaFileUpload, FaTrash, FaSpinner } from 'react-icons/fa';

const HealthRecords = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMember, setActiveMember] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [activeCase, setActiveCase] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Form states
  const [newMember, setNewMember] = useState({ name: '', relation: '' });
  const [newCase, setNewCase] = useState({ name: '', description: '' });
  const [newFile, setNewFile] = useState({
    name: '',
    file: null,
    type: 'Prescription',
    hospital: '',
    doctor: '',
    date: new Date().toISOString().slice(0, 10)
  });

  const { token, backendUrl } = useContext(AppContext);

  // Fetch all members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/user/health-records/members`, { 
        headers: { token } 
      });
      
      if (data.success) {
        setMembers(data.members);
      } else {
        toast.error(data.message || 'Failed to fetch members');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch member details
  const fetchMemberDetails = async (memberId) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/user/health-records/members/${memberId}`, { 
        headers: { token } 
      });
      
      if (data.success) {
        setMemberDetails(data.member);
      } else {
        toast.error(data.message || 'Failed to fetch member details');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new member
  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/health-records/members`, newMember, { 
        headers: { token, 'Content-Type': 'application/json' } 
      });
      
      if (data.success) {
        toast.success('Member added successfully');
        setNewMember({ name: '', relation: '' });
        setShowAddMember(false);
        fetchMembers();
      } else {
        toast.error(data.message || 'Failed to add member');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  // Create a new case
  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCase,
        memberId: activeMember
      };
      
      const { data } = await axios.post(`${backendUrl}/api/user/health-records/cases`, payload, { 
        headers: { token, 'Content-Type': 'application/json' } 
      });
      
      if (data.success) {
        toast.success('Case added successfully');
        setNewCase({ name: '', description: '' });
        setShowAddCase(false);
        fetchMemberDetails(activeMember);
      } else {
        toast.error(data.message || 'Failed to add case');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  // Upload file to R2 storage and add to database
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!newFile.file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploadingFile(true);
      
      // Step 1: Get presigned URL
      const { data: urlData } = await axios.post(`${backendUrl}/api/user/health-records/upload-url`, {
        fileName: newFile.file.name,
        fileType: newFile.file.type
      }, { headers: { token, 'Content-Type': 'application/json' } });
      
      if (!urlData.success) {
        toast.error(urlData.message || 'Failed to get upload URL');
        return;
      }
      
      // Step 2: Upload file to R2
      await axios.put(urlData.uploadUrl, newFile.file, {
        headers: { 'Content-Type': newFile.file.type }
      });
      
      // Step 3: Add file record to database
      const fileData = {
        memberId: activeMember,
        caseId: activeCase,
        name: newFile.name || newFile.file.name,
        url: urlData.publicUrl,
        type: newFile.type,
        hospital: newFile.hospital,
        doctor: newFile.doctor,
        date: newFile.date
      };
      
      const { data: fileResponse } = await axios.post(`${backendUrl}/api/user/health-records/files`, fileData, { 
        headers: { token, 'Content-Type': 'application/json' } 
      });
      
      if (fileResponse.success) {
        toast.success('File uploaded successfully');
        setNewFile({
          name: '',
          file: null,
          type: 'Prescription',
          hospital: '',
          doctor: '',
          date: new Date().toISOString().slice(0, 10)
        });
        setShowAddFile(false);
        fetchMemberDetails(activeMember);
      } else {
        toast.error(fileResponse.message || 'Failed to add file record');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete a file
  const handleDeleteFile = async (caseId, fileId, fileUrl) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      // Extract fileKey from URL
      const urlParts = fileUrl.split('/');
      const fileKey = urlParts.slice(urlParts.indexOf(activeMember) || -1).join('/');
      
      const { data } = await axios.post(`${backendUrl}/api/user/health-records/files/delete`, {
        memberId: activeMember,
        caseId,
        fileId,
        fileKey
      }, { headers: { token, 'Content-Type': 'application/json' } });
      
      if (data.success) {
        toast.success('File deleted successfully');
        fetchMemberDetails(activeMember);
      } else {
        toast.error(data.message || 'Failed to delete file');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, []);

  // Fetch member details when active member changes
  useEffect(() => {
    if (activeMember) {
      fetchMemberDetails(activeMember);
    } else {
      setMemberDetails(null);
    }
  }, [activeMember]);

  // File select handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewFile({
        ...newFile,
        file,
        name: file.name
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-medium mb-6">Health Records</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar - Family Members */}
        <div className="md:col-span-3 bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Family Members</h2>
            <button 
              onClick={() => setShowAddMember(true)}
              className="p-2 bg-primary text-white rounded-full hover:bg-blue-600"
            >
              <FaPlus />
            </button>
          </div>
          
          {loading && !members.length ? (
            <div className="flex justify-center py-4">
              <FaSpinner className="animate-spin text-primary text-2xl" />
            </div>
          ) : (
            <ul className="space-y-2">
              {members.map(member => (
                <li 
                  key={member._id}
                  className={`p-3 rounded-md cursor-pointer ${activeMember === member._id ? 'bg-blue-100 border-l-4 border-primary' : 'hover:bg-gray-100'}`}
                  onClick={() => setActiveMember(member._id)}
                >
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.relation}</div>
                </li>
              ))}
              
              {!members.length && !loading && (
                <div className="text-center py-4 text-gray-500">
                  No family members added yet
                </div>
              )}
            </ul>
          )}
        </div>
        
        {/* Main Content - Cases & Files */}
        <div className="md:col-span-9 bg-white rounded-lg shadow p-4">
          {activeMember && memberDetails ? (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-medium">
                    {memberDetails.name}'s Medical Cases
                  </h2>
                  <button
                    onClick={() => setShowAddCase(true)}
                    className="px-3 py-1 bg-primary text-white rounded hover:bg-blue-600 flex items-center gap-2"
                  >
                    <FaPlus /> Add Case
                  </button>
                </div>
                
                {!memberDetails.cases.length ? (
                  <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                    No medical cases added yet
                  </div>
                ) : (
                  <div className="space-y-6">
                    {memberDetails.cases.map(caseItem => (
                      <div key={caseItem._id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium">{caseItem.name}</h3>
                          <button
                            onClick={() => {
                              setActiveCase(caseItem._id);
                              setShowAddFile(true);
                            }}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 text-sm"
                          >
                            <FaFileUpload /> Add File
                          </button>
                        </div>
                        
                        {caseItem.description && (
                          <p className="text-gray-600 text-sm mb-3">
                            {caseItem.description}
                          </p>
                        )}
                        
                        {!caseItem.files.length ? (
                          <div className="text-center py-3 text-gray-500 border border-dashed rounded-lg">
                            No files added yet
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="p-2 text-left">Name</th>
                                  <th className="p-2 text-left">Type</th>
                                  <th className="p-2 text-left">Hospital</th>
                                  <th className="p-2 text-left">Doctor</th>
                                  <th className="p-2 text-left">Date</th>
                                  <th className="p-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {caseItem.files.map(file => (
                                  <tr key={file._id} className="border-t">
                                    <td className="p-2">
                                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                        {file.name}
                                      </a>
                                    </td>
                                    <td className="p-2">{file.type}</td>
                                    <td className="p-2">{file.hospital}</td>
                                    <td className="p-2">{file.doctor}</td>
                                    <td className="p-2">{new Date(file.date).toLocaleDateString()}</td>
                                    <td className="p-2">
                                      <button
                                        onClick={() => handleDeleteFile(caseItem._id, file._id, file.url)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Delete file"
                                      >
                                        <FaTrash />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              {loading ? (
                <FaSpinner className="animate-spin text-primary text-2xl mb-2" />
              ) : (
                <>
                  <p className="mb-2">Select a family member to view their medical records</p>
                  {!members.length && (
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 mt-2"
                    >
                      Add a Family Member
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-medium mb-4">Add Family Member</h2>
            <form onSubmit={handleCreateMember}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Relation</label>
                <select
                  value={newMember.relation}
                  onChange={(e) => setNewMember({...newMember, relation: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select Relation</option>
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add Case Modal */}
      {showAddCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-medium mb-4">Add Medical Case</h2>
            <form onSubmit={handleCreateCase}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Case Name</label>
                <input
                  type="text"
                  value={newCase.name}
                  onChange={(e) => setNewCase({...newCase, name: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  placeholder="e.g. Diabetes Treatment 2024"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({...newCase, description: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                  placeholder="Brief description of the medical case"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCase(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  Add Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add File Modal */}
      {showAddFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-medium mb-4">Upload Medical File</h2>
            <form onSubmit={handleFileUpload}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">File</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">File Name (Optional)</label>
                <input
                  type="text"
                  value={newFile.name}
                  onChange={(e) => setNewFile({...newFile, name: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Leave blank to use original filename"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">File Type</label>
                <select
                  value={newFile.type}
                  onChange={(e) => setNewFile({...newFile, type: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="Prescription">Prescription</option>
                  <option value="Test Report">Test Report</option>
                  <option value="Scan">Scan</option>
                  <option value="Discharge Summary">Discharge Summary</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Hospital/Clinic Name</label>
                <input
                  type="text"
                  value={newFile.hospital}
                  onChange={(e) => setNewFile({...newFile, hospital: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Optional"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={newFile.doctor}
                  onChange={(e) => setNewFile({...newFile, doctor: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Optional"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newFile.date}
                  onChange={(e) => setNewFile({...newFile, date: e.target.value})}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFile(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  disabled={uploadingFile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 flex items-center gap-2"
                  disabled={uploadingFile}
                >
                  {uploadingFile ? (
                    <>
                      <FaSpinner className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <FaFileUpload /> Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthRecords;