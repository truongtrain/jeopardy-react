import './App.css';
import React, {useState} from 'react';
import showData from './jeopardy.json'

console.log(showData);
const App = () => {
  let visibleMatrix = [];
  for (let row = 0; row < 5; row++) {
    visibleMatrix.push([]);
    for (let col = 0; col < 6; col++) {
      visibleMatrix[row].push(false);
    }
  }
  let [visible, setVisible] = useState(visibleMatrix);
  let [message, setMessage] = useState('');
  let [board, setBoard] = useState(showData.jeopardy_round);
  let [tableStyle, setTableStyle] = useState('table-light-off');
  let contestants = showData.contestants.filter(
    contestant => contestant !== showData.weakest_contestant
  );
  // useEffect(() => turnOffLight(), [message]);

  contestants.push('Alan');
  let scores = {};
  contestants.forEach(contestant => scores[contestant] = 0);
  let clueNumber = 1;
  setTimeout(() => findClue(clueNumber), 3000);  

  function findClue(clueNumber) {
    let visibleCopy = [...visible];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (showData.jeopardy_round[col][row].number === clueNumber) {
          const clue = showData.jeopardy_round[col][row];
          message = clue.category + ' for $' + clue.value;
          setMessage(message);
          visibleCopy[row][col] = true;
          setTimeout(() => showClue(visibleCopy, row, col), 2000);
          return;
        }
      }
    }
  }

  function showClue(visibleCopy, row, col) {
    setVisible(visibleCopy);
    const clue = showData.jeopardy_round[col][row];
    const charsPerSecond = 16;
    setTimeout(() => clearClue(row, col), 1000*clue.text.length/charsPerSecond);
  }

  function turnOffLight() {
    setMessage('Alan');
    setTableStyle('table-light-off');
  }

  function clearClue(row, col) {
    let board_copy = [...board];
    board_copy[col][row].text = '';
    setBoard(board_copy);
    setTableStyle('table-light-on');
  }

  function displayClue(row, column) {
    let visibleCopy = [...visible];
    if (visibleCopy[row][column] !== undefined) {
      visibleCopy[row][column] = true;
      setVisible(visibleCopy);
    }
  }

  return (
    <div>
      <div className='banner'>
        <h3>
        <span className='message'>{message}</span>
        <br></br>
        <button type='button' className='answer-button-2' onClick={turnOffLight}>Answer!</button>
          <div>${scores[contestants[0]]}<br></br>{contestants[0]}</div>
          <div>${scores[contestants[1]]}<br></br>{contestants[1]}</div>
          <div>${scores[contestants[2]]}<br></br>{contestants[2]}</div>
        </h3>
      </div>
      <table className={tableStyle}>
        <thead>
          <tr>
            <th>{board[0][0].category}</th>
            <th>{board[1][0].category}</th>
            <th>{board[2][0].category}</th>
            <th>{board[3][0].category}</th>
            <th>{board[4][0].category}</th>
            <th>{board[5][0].category}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(Array(5), (arrayElement, row) => {
            return (<tr key={row}>
            {board.map((round, column) => {
              return (
              <td key={column}>
                <span>{visible[row][column] && round[row].text}</span>
                {
                  !visible[row][column] && <button className='clue-button' onClick={() => displayClue(row, column)}>
                  ${round[row].value}
                  </button>
                }
              </td>)})}
          </tr>)
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
