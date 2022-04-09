import React, {useState} from 'react';

function Banner(props) {
    let [message, setMessage] = useState('');
    let scores = {};
    let contestants = props.contestants;
    contestants.forEach(contestant => scores[contestant] = 0);

    function updateMessage() {
        setMessage('Alan');
    }

    return (
        <div className='banner'>
            <h3>
            <span className='message'>{message}</span>
            <br></br>
            <button type='button' className='answer-button-2' onClick={updateMessage}>Answer!</button>
            <div>${scores[contestants[0]]}<br></br>{contestants[0]}</div>
            <div>${scores[contestants[1]]}<br></br>{contestants[1]}</div>
            <div>${scores[contestants[2]]}<br></br>{contestants[2]}</div>
            </h3>
        </div>
      );
  }

  export default Banner;