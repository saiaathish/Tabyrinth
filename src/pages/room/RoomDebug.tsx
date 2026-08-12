import type {GameState} from "../../game/types";
export function RoomDebug({state}:{state:GameState|null}){
  const rooms=state?.orderedRoomIds??[];
  return <aside aria-label="Tab topology"><strong>Managed topology</strong><ol>{rooms.map((id,index)=><li key={id} aria-current={id===state?.player.currentRoomId?"location":undefined}><span>{index+1}. {id}</span><small> tab {state?.roomById[id]?.tabId}</small></li>)}</ol><p>{rooms.length} managed room{rooms.length===1?"":"s"} · revision {state?.revision??"—"}</p></aside>;
}
