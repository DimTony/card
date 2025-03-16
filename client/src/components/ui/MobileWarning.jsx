import React from 'react'

const MobileWarning = () => {
  return (
    <>
      <div className="desktop-message">
        <h2>Mobile Only Content</h2>
        <p>
          Please view this app on a mobile device (screen width less than
          768px).
        </p>
      </div>
    </>
  );
}

export default MobileWarning