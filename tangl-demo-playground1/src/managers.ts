import {MetaManager, SceneManager, viewerStore, SceneEvents} from "tangl-viewer";
//@ts-ignore
const env = import.meta.env;

export const isAuth = /^true$/i.test(env.VITE_AUTH);

import App from "./App.vue";
import {createApp} from "vue";

export const app = createApp(App);

export const sceneManager = new SceneManager().setServer(env.VITE_TANGL_SERVER)
export const metaManager = new MetaManager().setServer(env.VITE_TANGL_SERVER, env.VITE_TANGL_CACHE_SERVER)
export const renderManager = viewerStore.createRenderManager("default", sceneManager, metaManager)!

sceneManager.addEventListener(SceneEvents.Selected, onSceneSelected)

async function onSceneSelected(e) {
  // console.log("metaManager", metaManager)
  // console.log("sceneManager", sceneManager)
  // console.log("renderManager", renderManager)
  const elNum = e.elNums[0]
  // let test2 = await metaManager.getElementGuid(elNum)
  let elemetMeta = await metaManager.getElementMetaByNumbers(elNum)
  const fileName = metaManager.models.get("fb5ef230-ac88-671d-9d03-3a1878afdd89")?.name
  console.log(elemetMeta, fileName);
  const response = await fetch(`http://localhost:4000/get-vocabulary/?globalid=${elemetMeta.ElementGuid}&fileName=${fileName}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  // Проверка статуса ответа
  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json();
  console.log(result)
  if (result != null){
    if (result.RUS_DivisionNumber){
      console.log("RUS_DivisionNumber",result.RUS_DivisionNumber);
    }
    if (result.RUS_StartDatePlan){
      console.log("RUS_StartDatePlan",result.RUS_StartDatePlan);
    }
    if (result.RUS_StartDateIs){
      console.log("RUS_StartDateIs",result.RUS_StartDateIs);
    }
    if (result.RUS_EndDatePlan){
      console.log("RUS_EndDatePlan",result.RUS_EndDatePlan);
    }
    if (result.RUS_EndDateIs){
      console.log("RUS_EndDateIs",result.RUS_EndDateIs);
    }
  }
}