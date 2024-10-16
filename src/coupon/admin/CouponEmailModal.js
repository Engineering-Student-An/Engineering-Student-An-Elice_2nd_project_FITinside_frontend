import React, { useEffect, useState } from 'react';
import Modal from 'react-modal'; // 모달 라이브러리 사용
import CouponEmailTemplate from "./CouponEmailTemplate";
import sendRefreshTokenAndStoreAccessToken from "../../auth/RefreshAccessToken"; // 이메일 템플릿 컴포넌트 추가

const CouponEmailModal = ({ isOpen, onRequestClose, coupon }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEmails, setSelectedEmails] = useState([]);
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (coupon) {
            fetchMembers(coupon.id);
        }
    }, [coupon]);

    const fetchMembers = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:8080/api/admin/coupons/${id}/members`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
            });

            if (!response.ok) {
                throw new Error('회원 목록을 가져오는 데 실패했습니다.');
            }

            const data = await response.json();
            setMembers(data.members); // 응답 데이터 설정
        } catch (err) {
            try {
                await sendRefreshTokenAndStoreAccessToken();
                window.location.reload();
            } catch (e) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSelection = (email) => {
        setSelectedEmails((prevSelected) => {
            if (prevSelected.includes(email)) {
                return prevSelected.filter((item) => item !== email); // 선택 해제
            } else {
                return [...prevSelected, email]; // 선택 추가
            }
        });
    };

    const sendCouponEmails = async () => {
        setSending(true);
        setProgress(0); // 진행률 초기화

        try {
            for (let i = 0; i < selectedEmails.length; i++) {
                const email = selectedEmails[i];
                const emailTemplate = CouponEmailTemplate({coupon: coupon}); // 이메일 템플릿 HTML 가져오기

                // 실제 이메일 전송 요청
                const response = await fetch('http://localhost:8080/api/admin/coupons/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        couponId: coupon.id, address: email, template: emailTemplate // 결합된 템플릿 사용
                    })
                });

                if (!response.ok) {
                    throw new Error(`이메일 전송에 실패했습니다: ${email}`);
                }

                // 진행률 업데이트
                setProgress(((i + 1) / selectedEmails.length) * 100);
                await new Promise(resolve => setTimeout(resolve, 50)); // 요청 사이에 잠시 대기
            }

            alert('모든 쿠폰 이메일 전송을 완료했습니다!');
            onRequestClose(); // 모달 닫기
        } catch (err) {
            try {
                await sendRefreshTokenAndStoreAccessToken();
                window.location.reload();
            } catch (e) {
                console.error(err.message);
            }
        } finally {
            setSending(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedEmails([]); // 모달 닫을 때 체크박스 초기화
        onRequestClose(); // 모달 닫기
    };

    const selectAllEmails = () => {
        const allEmails = members.map(member => member.email);
        setSelectedEmails(allEmails);
    };

    const deselectAllEmails = () => {
        setSelectedEmails([]);
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={handleCloseModal}
            contentLabel="회원 목록"
            ariaHideApp={false}
            style={{
                content: {
                    maxWidth: `70%`,
                    maxHeight: `80%`,
                    margin: 'auto',
                    padding: '40px',
                    borderRadius: '10px'
                },
                overlay: {
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                }
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="text-center mb-4">쿠폰 미보유 회원 목록</h2>
                <button onClick={handleCloseModal} style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    marginTop: '-30px'
                }}>&times;</button>
            </div>
            {loading && <p>로딩 중...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className="d-flex justify-content-between" style={{ margin: '20px 0' }}>
                <div className="d-flex justify-content-start">
                    <button onClick={selectAllEmails} className="btn btn-light text-dark"
                            style={{ border: '1px solid #ced4da', marginRight: `10px` }}>
                        전체 선택
                    </button>
                    <button onClick={deselectAllEmails} className="btn btn-danger">
                        전체 선택 해제
                    </button>
                </div>

                <button onClick={sendCouponEmails} disabled={selectedEmails.length === 0 || sending}
                        className="btn btn-light text-dark"
                        style={{ border: '1px solid #ced4da', marginRight: `10px` }}>
                    이메일 전송
                </button>
            </div>

            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {members.map(member => (
                    <li key={member.email} style={{ marginBottom: '10px' }}>
                        <label className="d-flex justify-content-start">
                            <input
                                type="checkbox" className="form-check me-1"
                                checked={selectedEmails.includes(member.email)}
                                onChange={() => handleEmailSelection(member.email)}
                            />
                            {member.userName} ({member.email})
                        </label>
                    </li>
                ))}
            </ul>

            {sending && (
                <div style={{ marginTop: '20px' }}>
                    <p>이메일 전송 중... {progress.toFixed(0)}%</p>
                    <div style={{ width: '100%', backgroundColor: '#f3f3f3', borderRadius: '5px' }}>
                        <div style={{
                            height: '10px',
                            width: `${progress}%`,
                            backgroundColor: '#4caf50',
                            borderRadius: '5px'
                        }} />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default CouponEmailModal;
