import React, { useEffect, useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../context/AppContext';

const Room = () => {
    const { appointmentId } = useParams();
    const [isConsent, setIsConsent] = useState(false);
    const { backendUrl, token } = useContext(AppContext);
        const fetchRoom = async () => {
            try {
                const res = await axios.get(`${backendUrl}/api/user/room/${appointmentId}`, {
                    headers: {
                        token,
                    },
                });

                if (res.status === 200) {
                    console.log("Room details:", res.data.room.url);

                    // Load DailyIframe script only once
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/@daily-co/daily-js';
                    script.onload = () => {
                        const callFrame = window.DailyIframe.createFrame({
                            showLeaveButton: true,
                            iframeStyle: {
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                top: 0,
                                left: 0,
                                border: 'none',
                            },
                        });
                        callFrame.join({ url: res.data.room.url });
                    };
                    document.body.appendChild(script);
                }
            } catch (error) {
                console.error("Error fetching room details:", error);
            }
        };

        const handleConsent = () => {
            setIsConsent(true);
            fetchRoom();
        }

        return isConsent ? (
            <div className="flex flex-col items-center justify-center h-screen px-8">
              <h1 className="text-2xl font-bold mb-4">Thank you for your consent</h1>
              <p className="text-lg mb-6">You may now proceed with your teleconsultation.</p>
              <button
                className="text-white text-sm font-medium px-20 py-3 rounded-full bg-blue-600 hover:bg-blue-700"
                onClick={fetchRoom}
              >
                Join Consultation
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center py-8">
              <h1 className="text-2xl font-bold mb-4">Telemedicine Consent Form</h1>
              <h2 className="text-xl font-semibold mb-3">As per Indian Telemedicine Practice Guidelines (2020)</h2>
              <p className="text-lg mb-6">
                Please review and consent to the following before proceeding with your teleconsultation:
              </p>
              <div className="text-sm bg-gray-100 p-6 rounded-lg shadow-md max-w-2xl text-left">
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I hereby provide my informed and explicit consent for teleconsultation with a registered medical practitioner through this platform.
                  </p>
                </div>
                
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I understand that teleconsultation involves the use of electronic communications to enable healthcare providers to share individual patient health information for diagnosis, therapy, follow-up and/or education.
                  </p>
                </div>
                
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I acknowledge that the doctor will determine whether my condition is suitable for teleconsultation, and may advise an in-person consultation if deemed necessary.
                  </p>
                </div>
                
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I understand that in case of emergency or critical health conditions, I should seek immediate in-person medical attention rather than teleconsultation.
                  </p>
                </div>
                
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I confirm that the information I provide during the consultation will be truthful, accurate, and complete to the best of my knowledge, and understand that inaccurate information may affect the quality of diagnosis or treatment.
                  </p>
                </div>
                
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I understand that patient identification is required as per the guidelines, and I will provide accurate identification information as requested.
                  </p>
                </div>
                
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I understand that the platform will maintain records of teleconsultation including patient information, medical records, and prescription details for the period specified by relevant laws.
                  </p>
                </div>
                
                <div className="flex items-start mb-3">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I understand that this platform follows appropriate data privacy and security measures to protect my health information as per applicable laws including the Information Technology Act, 2000.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <input type="checkbox" className="mt-1 mr-2" checked readOnly />
                  <p>
                    I confirm that I am consulting voluntarily and understand both the benefits and limitations of telemedicine consultations.
                  </p>
                </div>
              </div>
              
              <button
                className="mt-6 text-white text-sm font-medium px-20 py-3 rounded-full bg-blue-600 hover:bg-blue-700"
                onClick={handleConsent}
              >
                I Consent to Telemedicine Consultation
              </button>
            </div>
          );
        
    }
export default Room;
