import React, {useState, useEffect} from 'react';
import Timer from './Timer';


function Banner(props) {
    const [message, setMessage] = useState('');
    const [clueNumber, setClueNumber] = useState(1);
    const [isActive, setIsActive] = useState(true);
    let board = props.board;
    let scores = {};
    let contestants = props.contestants;
    let interval = null;
    //useEffect(() => findClue(clueNumber), [clueNumber]);
    document.addEventListener('click', () => answer());

    useEffect(() => {
        if (isActive) {
            interval = setInterval(() => findClue(clueNumber), 3000);
        } else if (!isActive) {
            clearInterval(interval);
        }   
        return () => clearInterval(interval);
      }, [clueNumber]);

    contestants.forEach(contestant => scores[contestant] = 0);
    // setTimeout(() => setClueNumber(clueNumber+1), 3000);

    function findClue(clueNumber) {
        console.log(isActive);
        if (!isActive) {
            return;
        }
        console.log(clueNumber);
        //let visibleCopy = [...visible];
        for (let col = 0; col < 6; col++) {
          for (let row = 0; row < 5; row++) {
            if (board[col][row].number === clueNumber) {
              const clue = board[col][row];
              const message = clue.category + ' for $' + clue.value;
              setMessage(message);
              setClueNumber(clueNumber+1);
              //visibleCopy[row][col] = true;
              //setTimeout(() => showClue(visibleCopy, row, col), 2000);
              return;
            }
          }
        }
      }

    function answer() {
        setMessage('Alan');
        clearInterval(interval);
        // pause();
    }

    return (
        <div className='banner'>
            <Timer />
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