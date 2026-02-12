import React from 'react';

interface Props {
  onOpenSettings: () => void;
}

const Home: React.FC<Props> = ({ onOpenSettings }) => {
  return (
    <div className="section">
      <h1 className="headline">you decide for yourself.</h1>

      <div className="steps">
        <p>1. add the domains.</p>
        <p>2. upload your message.</p>
        <p>3. face it before distraction.</p>
        <p>4. decide deliberately.</p>
      </div>

      <button className="primary" onClick={onOpenSettings}>
        go to settings
      </button>
    </div>
  );
};

export default Home;
