import React from 'react';

function Banner(props) {
    const message = props.message;
    const contestants = props.contestants;
    const names = Object.keys(contestants);

    return (
        <div className='banner'>
            <h3>
            <span className='message'>{message.line1} <br /> {message.line2}</span>
            <br></br>
            {names.map(name => 
            <div key={name}>
                ${contestants[name] && contestants[name].score}<br></br>
                {name}<br></br>
                {contestants[name] && contestants[name].response}<br></br>
                {contestants[name] && contestants[name].wager}
            </div>
            )}
            </h3>
        </div>
      );     
  }

  export default Banner;