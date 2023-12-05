import { BiShow } from 'react-icons/bi';
import { FcApprove } from 'react-icons/fc';
import { FcDisapprove } from 'react-icons/fc';
import { HiHandRaised } from 'react-icons/hi2';
import { BsFillFlagFill } from 'react-icons/bs';
import FinalMusic from '../resources/final_jeopardy.mp3';
import { useContext } from 'react';
import { ScoreContext, PlayerContext, GameInfoContext } from '../App';

function Board(props) {
    const scores = useContext(ScoreContext);
    const playerName = useContext(PlayerContext);
    const gameInfoContext = useContext(GameInfoContext);
    let { board, disableAnswer, disableClue, displayClueByNumber,
        setMessageLines, updateOpponentScores, enterFullScreen, updateAvailableClueNumbers,
        readClue, setBoardState, concede, readText, player, showData,
        setScores, stats, msg, response, setDisableAnswer,
        setResponseTimerIsActive, setDisableClue, setLastCorrect,
        answered, setAnswered, weakest } = props;

    function getCategory(column) {
        let i = 0;
        while (i < column.length && !column[i].category) {
            i++;
        }
        return column[i].category;
    }

    function isFinalJeopardyCategoryCell(row, col) {
        return row === 1 && col === 3;
    }

    function isFinalJeopardyResponseCell(row, col) {
        return row === 2 && col === 3;
    }

    function displayClue(row, col) {
        enterFullScreen();
        if (gameInfoContext.state.round === 0) {
            gameInfoContext.dispatch({ type: 'increment_round', round: 1 });
        }
        if (gameInfoContext.state.round === 1.5) {
            gameInfoContext.dispatch({ type: 'increment_round', round: 2 });
        }
        player.conceded = false;
        setDisableAnswer(false);
        setAnswered([]);
        setLastCorrect(playerName);
        const clue = board[col][row];
        if (clue.daily_double_wager > 0) {
          player.wager = scores[playerName].score;
          setBoardState(row, col, 'wager');
          readText('Answer. Daily double. How much will you wager');
        } else {
          setMessageLines('');
          response.seconds = 0;
          response.countdown = false;
          updateAvailableClueNumbers(clue.number);
          setBoardState(row, col, 'clue');
          readClue(row, col);
        }
    }

    function answer(row, col) {
        setDisableAnswer(true);
        setResponseTimerIsActive(false);
        let bonusProbability = 0;
        let incorrectContestants = board[col][row].response.incorrect_contestants
          .filter(contestant => contestant !== weakest)
          .filter(contestant => !answered.includes(contestant));
        if (answered.length === 1) {
          bonusProbability = 0.166; // increase the probability of a successful buzz-in if a contestant has already answered this clue
        }
        const probability = getProbability(board[col][row].value, gameInfoContext.state.round, bonusProbability);
        if (response.seconds < 3 && (answered.length === 2 || isFastestResponse(response.seconds, probability) || noAttempts(row, col) || noOpponentAttemptsRemaining(row, col))) {
          readText(playerName);
          response.countdown = true;
          setBoardState(row, col, 'eye');
        } else {
          if (board[col][row].visible === 'closed') {
            setMessageLines(board[col][row].response.correct_response);
          } else if (incorrectContestants.length === 0 && board[col][row].response.correct_contestant !== weakest) {
            readText(board[col][row].response.correct_contestant);
          } else if (incorrectContestants.length > 0) {
            readText(incorrectContestants[0]);
          }
          updateOpponentScores(row, col);
        }
        clearInterval(response.interval);
      }

      function noAttempts(row, col) {
        return isTripleStumper(row, col) && board[col][row].response.incorrect_contestants.length === 0;
      }
    
      function noOpponentAttemptsRemaining(row, col) {
        const incorrectContestants = board[col][row].response.incorrect_contestants.filter(contestant => contestant !== weakest);
        return answered.length === incorrectContestants.length && isTripleStumper(row, col);
      }

      function isTripleStumper(row, col) {
        return !board[col][row].response.correct_contestant || board[col][row].response.correct_contestant === weakest;
      }

      function getProbability(value, round, bonusProbability) {
        if (round <= 1) {
          switch (value) {
            case 200:
              return 0.424 + bonusProbability;
            case 400:
              return 0.492 + bonusProbability;
            case 600:
              return 0.500 + bonusProbability;
            case 800:
              return 0.541 + bonusProbability;
            case 1000:
              return 0.636 + bonusProbability;
            default:
              return 0;
          }
        } else if (round === 2) {
          switch (value) {
            case 400:
              return 0.452 + bonusProbability;
            case 800:
              return 0.535 + bonusProbability;
            case 1200:
              return 0.563 + bonusProbability;
            case 1600:
              return 0.623 + bonusProbability;
            case 2000:
              return 0.704 + bonusProbability;
            default:
              return 0;
          }
        }
      }
    
      function isFastestResponse(seconds, probability) {
        const randomNumber = Math.random();
        seconds %= 5;
        console.log('seconds: ' + seconds);
        console.log('randomNumber: ' + randomNumber);
        let adjustedProbability;
        if (seconds <= 0.1) {
          adjustedProbability = Math.pow(probability, 0.5);
        } else if (seconds <= 0.2) {
          adjustedProbability = probability;
        } else if (seconds <= 0.4) {
          adjustedProbability = Math.pow(probability, 2);
        } else if (seconds <= 0.6) {
          adjustedProbability = Math.pow(probability, 3);
        } else if (seconds <= 0.8) {
          adjustedProbability = Math.pow(probability, 4);
        } else if (seconds <= 1) {
          adjustedProbability = Math.pow(probability, 5);
        } else if (seconds <= 1.25) {
          adjustedProbability = Math.pow(probability, 6);
        } else if (seconds <= 1.5) {
          adjustedProbability = Math.pow(probability, 7);
        } else if (seconds <= 1.75) {
          adjustedProbability = Math.pow(probability, 8);
        } else if (seconds <= 2) {
          adjustedProbability = Math.pow(probability, 9);
        } else if (seconds < 3) {
          adjustedProbability = Math.pow(probability, 10);
        }
        console.log('adjusted probablility: ' + adjustedProbability);
        console.log(randomNumber <= adjustedProbability);
        return randomNumber <= adjustedProbability;
      }
    
      function incrementScore(row, col) {
        setDisableClue(false);
        setLastCorrect(playerName);
        msg.text = 'Correct';
        window.speechSynthesis.speak(msg);
        if (board[col][row].daily_double_wager > 0) {
          scores[playerName].score += +player.wager;
        } else {
          scores[playerName].score += board[col][row].value;
        }
        setScores(scores);
        stats.coryatScore += board[col][row].value;
        stats.numCorrect += 1;
        resetClue(row, col);
      }
    
      function deductScore(row, col) {
        msg.text = 'No';
        window.speechSynthesis.speak(msg);
        if (board[col][row].daily_double_wager > 0) {
          scores[playerName].score -= player.wager;
        } else {
          scores[playerName].score -= board[col][row].value;
          stats.coryatScore -= board[col][row].value;
        }
        setScores(scores);
        updateOpponentScores(row, col);
        resetClue(row, col);
        setDisableClue(false);
      }

      function resetClue(row, col) {
        setBoardState(row, col, 'closed');
        setResponseTimerIsActive(false);
        response.countdown = false;
      }

      function showAnswer(row, col) {
        setResponseTimerIsActive(false);
        response.countdown = false;
        setBoardState(row, col, 'judge');
        if (gameInfoContext.state.round === 3) {
          setMessageLines(showData.final_jeopardy.correct_response);
        } else {
          setMessageLines(board[col][row].response.correct_response);
        }
      }

      function submit(row, col) {
        if (gameInfoContext.state.round === 3) {
          document.getElementById('final-input').value = null;
          setDisableAnswer(true);
          response.countdown = false;
          setScores(scores);
          showFinalJeopardyClue();
        } else {
          setBoardState(row, col, 'clue');
          displayClueByNumber(board[col][row].number);
        }
      }

      function showFinalJeopardyClue() {
        let finalMusic = new Audio(FinalMusic);
        setBoardState(1, 3, 'final');
        gameInfoContext.dispatch({ type: 'update_image', imageUrl: showData.final_jeopardy.url});
        msg.text = showData.final_jeopardy.clue;
        window.speechSynthesis.speak(msg);
        msg.addEventListener('end', () => {
          finalMusic.play();
        });
        finalMusic.addEventListener('ended', () => {
          showFinalJeopardyResults();
        });
      }

      function showFinalJeopardyResults() {
        stats.battingAverage = stats.numCorrect / stats.numClues * 1.0;
        console.log(stats);
        scores[playerName].response = player.finalResponse;
        scores[playerName].wager = player.wager;
        Object.keys(scores).forEach(contestant => {
          showData.final_jeopardy.contestant_responses.forEach(response => {
            if (response.contestant === contestant) {
              scores[contestant].response = response.response;
              scores[contestant].wager = 0;
              if (scores[contestant].score >= response.wager) {
                scores[contestant].wager = response.wager;
              } else {
                scores[contestant].wager = scores[contestant].score;
              }
            }
          });
        });
        setScores(scores);
        gameInfoContext.dispatch({ type: 'update_image', imageUrl: ''});
        setMessageLines(showData.final_jeopardy.correct_response);
      }

      const handleInputChange = event => {
        if (isNaN(event.target.value)) {
          player.finalResponse = event.target.value;
        } else {
          player.wager = event.target.value;
        }
      }


    return (
        <table id='board'>
            <thead>
                <tr id='headers'>
                    {Array.from(Array(6), (_arrayElement, row) =>
                        <th key={'header' + row}>{gameInfoContext.state.round !== 3 && getCategory(board[row])}
                            {board[row][0].category_note && <span className='tooltip'>{board[row][0].category_note}</span>}
                        </th>
                    )}
                </tr>
            </thead>
            <tbody>
                {Array.from(Array(5), (_arrayElement, row) =>
                    <tr key={'row' + row}>
                        {board.map((category, column) =>
                            <td key={'column' + column}>
                                {!category[row].visible && <button className='clue' onClick={() => displayClue(row, column)} disabled={disableClue}>${category[row].value}</button>}
                                <span>{category[row] && category[row].visible === 'clue' && category[row].text}</span>
                                {category[row].visible === 'buzzer' && category[row].daily_double_wager === 0 &&
                                    <div className='clue'>
                                        <button className='answer-button buzzer-button' onClick={() => answer(row, column)} disabled={disableAnswer}><HiHandRaised /></button>
                                        <button className='answer-button flag-button' onClick={() => concede(row, column)}><BsFillFlagFill /></button>
                                    </div>
                                }
                                {category[row].visible === 'eye' &&
                                    <div>
                                        <button className='eye-button' onClick={() => showAnswer(row, column)}><BiShow /></button>
                                    </div>
                                }
                                {category[row].visible === 'judge' &&
                                    <div className='clue'>
                                        <button className='answer-button' onClick={() => incrementScore(row, column)}><FcApprove /></button>
                                        <button className='answer-button' onClick={() => deductScore(row, column)}><FcDisapprove /></button>
                                    </div>
                                }
                                {category[row].visible === 'wager' &&
                                    <div>
                                        ENTER YOUR WAGER:
                                        <div className='wager'>
                                            <button className='submit-button' onClick={() => submit(row, column)}>SUBMIT</button>
                                            <input defaultValue={player.wager} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                }
                                {gameInfoContext.state.round === 3 && isFinalJeopardyCategoryCell(row, column) && category[row].visible !== 'final' &&
                                    <h3>
                                        {showData.final_jeopardy.category}
                                    </h3>
                                }
                                {isFinalJeopardyCategoryCell(row, column) && category[row].visible === 'final' &&
                                    <div>
                                        {showData.final_jeopardy.clue.toUpperCase()}
                                    </div>
                                }
                                {gameInfoContext.state.round === 3 && isFinalJeopardyResponseCell(row, column) &&
                                    <div>
                                        {board[3][1].visible !== 'final' && <span>ENTER YOUR WAGER:</span>}
                                        {board[3][1].visible === 'final' && <span>ENTER YOUR RESPONSE:</span>}
                                        <div className='wager'>
                                            {board[3][1].visible !== 'final' && <button id='final-submit-button' className='submit-button' disabled={disableAnswer} onClick={submit}>SUBMIT</button>}
                                            <input id='final-input' defaultValue={player.wager} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                }
                            </td>
                        )}
                    </tr>
                )}
            </tbody>
        </table>
    );
}

export default Board;