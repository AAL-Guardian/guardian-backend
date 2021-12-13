import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../common/response.template";
import fetch from 'node-fetch';

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  let skills: {
    [key: string]: string
  };
  const release = await fetch("https://api.github.com/repos/AAL-Guardian/misty-hri/releases/latest");
  const data = await release.json() as {
    name: string,
    tag_name: string,
  };

  if(process.env.stage === 'dev') {
    skills = {
      change_led: data.tag_name,
      eye_contact: data.tag_name,
      head_position_reporter: data.tag_name,
      listen_answers: data.tag_name,
      listen_voices: data.tag_name,
      sense_touch: data.tag_name,
      speak_from_url: data.tag_name,
      take_photo_to_position: data.tag_name,
      volume_check: data.tag_name,
    };
  } else {
    skills = {
      change_led: "2021-12-13-09-41",
      eye_contact: "2021-12-13-09-41",
      head_position_reporter: "2021-12-13-09-41",
      listen_answers: "2021-12-13-09-41",
      listen_voices: "2021-12-13-09-41",
      sense_touch: "2021-12-13-09-41",
      speak_from_url: "2021-12-13-09-41",
      take_photo_to_position: "2021-12-13-09-41",
      volume_check: "2021-12-13-09-41",
    };
  }
  
  response.body = JSON.stringify({
    skills,
    baseUrl: "https://github.com/AAL-Guardian/misty-hri/releases/download/{version}/{skill_name}.zip"
  })
  return response;
}