import React from 'react';

function Banner(props) {
    const message = props.message;
    const correct = props.correct;
    const scores = props.scores;
    const contestants = props.contestants;
    const names = Object.keys(contestants);

    return (
        <div className='banner'>
            <h3>
            <span className='message'>{message} <br /> {correct}</span>
            <br></br>
            <div>
                ${scores[names[0]]}<br></br>
                {names[0]}<br></br>
                {contestants[names[0]] && contestants[names[0]].response}<br></br>
                {contestants[names[0]] && contestants[names[0]].wager}
            </div>
            <div>
                ${scores[names[1]]}<br></br>
                {names[1]}<br></br>
                {contestants[names[1]] && contestants[names[1]].response}<br></br>
                {contestants[names[1]] && contestants[names[1]].wager}
            </div>
            <div>
                ${scores[names[2]]}<br></br>
                {names[2]}<br></br>
                {contestants[names[2]] && contestants[names[2]].response}<br></br>
                {contestants[names[2]] && contestants[names[2]].wager}
            </div>
            </h3>
        </div>
      );     
    
  }

  export default Banner;