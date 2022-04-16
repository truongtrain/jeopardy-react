import React from 'react';

function Banner(props) {
    const message = props.message;
    const correct = props.correct;
    const scores = props.scores;
    const contestants = props.contestants;
    const responses = props.responses;
    const wagers = props.wagers;

    return (
        <div className='banner'>
            <h3>
            <span className='message'>{message} <br /> {correct}</span>
            <br></br>
            <div>
                ${scores[contestants[0]]}<br></br>
                {contestants[0]}<br></br>
                {responses[contestants[0]]}<br></br>
                {wagers[contestants[0]]}
            </div>
            <div>
                ${scores[contestants[1]]}<br></br>
                {contestants[1]}<br></br>
                {responses[contestants[1]]}<br></br>
                {wagers[contestants[1]]}
            </div>
            <div>
                ${scores[contestants[2]]}<br></br>
                {contestants[2]}<br></br>
                {responses[contestants[2]]}<br></br>
                {wagers[contestants[2]]}
            </div>
            </h3>
        </div>
      );
  }

  export default Banner;