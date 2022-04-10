import './App.css';
import React, {useState, useEffect} from 'react';
import showData from './jeopardy.json';
import Banner from './Banner';

console.log(showData);

const contestants = showData.contestants.filter(
  contestant => contestant !== showData.weakest_contestant
);
contestants.push('Alan');
const scores = {};
contestants.forEach(contestant => scores[contestant] = 0);

const App = () => {
  const [visible, setVisible] = useState(getDefaultVisible());
  const [board, setBoard] = useState(showData.jeopardy_round);
  const [tableStyle, setTableStyle] = useState('table-light-off');
  const [clueNumber, setClueNumber] = useState(1);
  const [message, setMessage] = useState('');
  const [isActive, setActive] = useState(true);
  let interval = null;

  document.addEventListener('click', () => answer());

  useEffect(() => {
    if (isActive) {
      interval = setInterval(() => chooseClue(clueNumber), 3000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [clueNumber]);

  function chooseClue(clueNumber) {
    setTableStyle('table-light-off');
    let visibleCopy = [...visible];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          const clue = board[col][row];
          const message = clue.category + ' for $' + clue.value;
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

  function clearClue(row, col) {
    let board_copy = [...board];
    board_copy[col][row].text = '';
    const correctContestant = board_copy[col][row].response.correct_contestant;
    setBoard(board_copy);
    setTableStyle('table-light-on');
    setClueNumber(clueNumber+1);
  }

  function answer() {
    setActive(false);
    setMessage('Alan');
    clearInterval(interval);
  }

  function displayClue(row, column) {
    let visibleCopy = [...visible];
    if (visibleCopy[row][column] !== undefined) {
      visibleCopy[row][column] = true;
      setVisible(visibleCopy);
    }
  }

  function getDefaultVisible() {
    let visibleMatrix = [];
    for (let row = 0; row < 5; row++) {
      visibleMatrix.push([]);
      for (let col = 0; col < 6; col++) {
        visibleMatrix[row].push(false);
      }
    }
    return visibleMatrix;
  }

  return (
    <div>
      <Banner contestants={contestants} message={message} scores={scores} />
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
