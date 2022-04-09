import React, {useState, useEffect} from 'react';

function Timer(props) {
    let board = props.board;
    let clueNumber = 1;
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(true);
    //setTimeout(() => findClue(clueNumber), 3000);
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(seconds => seconds + 0.1)
            }, 100)
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }   
        
        return () => clearInterval(interval);
      }, [seconds]);

      document.addEventListener('click', () => pause());

      function reset() {
        setSeconds(0);
        setIsActive(false);
      }

      function pause() {
        setIsActive(false);
      }

    function findClue(clueNumber) {
        //let visibleCopy = [...visible];
        for (let col = 0; col < 6; col++) {
          for (let row = 0; row < 5; row++) {
            if (board[col][row].number === clueNumber) {
              const clue = board[col][row];
              //const message = clue.category + ' for $' + clue.value;
              //setMessage(message);
              //visibleCopy[row][col] = true;
              //setTimeout(() => showClue(visibleCopy, row, col), 2000);
              return;
            }
          }
        }
      }
      return (<div>{seconds.toFixed(1)}</div>);
}

export default Timer;