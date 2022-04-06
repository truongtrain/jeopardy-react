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
  let contestants = showData.contestants.filter(
    contestant => contestant !== showData.weakest_contestant
  );
  contestants.push('Alan');
  let scores = {};
  contestants.forEach(contestant => scores[contestant] = 0);

  function displayClue(row, column) {
    let visibleCopy = [...visible];
    if (visibleCopy[row][column] !== undefined) {
      visibleCopy[row][column] = true;
      setVisible(visibleCopy);
    }
  }

  return (
    <div>
      <h3>
        <div>{contestants[0]}: ${scores[contestants[0]]}</div>
        <div>{contestants[1]}: ${scores[contestants[1]]}</div>
        <div>{contestants[2]}: ${scores[contestants[2]]}</div>
      </h3>
      <br></br><br></br><br></br>
      <table>
        <thead>
          <tr>
            <th>{showData.jeopardy_round[0][0].category}</th>
            <th>{showData.jeopardy_round[1][0].category}</th>
            <th>{showData.jeopardy_round[2][0].category}</th>
            <th>{showData.jeopardy_round[3][0].category}</th>
            <th>{showData.jeopardy_round[4][0].category}</th>
            <th>{showData.jeopardy_round[5][0].category}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(Array(5), (arrayElement, row) => {
            return (<tr key={row}>
            {showData.jeopardy_round.map((round, column) => {
              return (
              <td key={column}>
                <span>{visible[row][column] && round[row].text}</span>
                {
                  !visible[row][column] && <button onClick={() => displayClue(row, column)}>
                  {round[row].value}
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
