import React from 'react';

function Banner(props) {
    const message = props.message;
    const scores = props.scores;
    const contestants = props.contestants;

    return (
        <div className='banner'>
            <h3>
            <span className='message'>{message}</span>
            <br></br>
            <div>${scores[contestants[0]]}<br></br>{contestants[0]}</div>
            <div>${scores[contestants[1]]}<br></br>{contestants[1]}</div>
            <div>${scores[contestants[2]]}<br></br>{contestants[2]}</div>
            </h3>
        </div>
      );
  }

  export default Banner;