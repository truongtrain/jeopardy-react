import React from 'react';
import './Podium.css';

function Podium(props) {
    const contestants = props.contestants;
    const names = Object.keys(contestants);

    return (
        <div className='podiums'>
            {names.map(name => 
            <div className='podium' key={name}>
                <div>${contestants[name] && contestants[name].score}</div>
                <div>{name}</div>
                <div>{contestants[name] && contestants[name].response}</div>
                <div>{contestants[name] && contestants[name].wager}</div>
            </div>
            )}
        </div>
      );     
  }

  export default Podium;