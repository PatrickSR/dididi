const fs = require('fs')
const download = require('download')
const axios = require('axios').default
const path = require('path')
const config = require('./config')

function getRequestHeader() {
  return {
    Authorization: config.authorization,
    'Authorization-Sso': config.sso
  }
}


function delay(second) {
  return new Promise(resolve => setTimeout(resolve, second * 1000))
}

/**
 * 拉取某个课程的章节列表
 * @param {*} id 课程id
 */
function getCourseSectionList(id) {
  const jsonData = `{"search":{"order":{"sort":"asc"},"sort":0,"course_id":"${id}"}}`

  return axios.get(`https://wap-api.xplus.xiaodengta.com/zaker/CourseSection?jsonData=${jsonData}&page=1&pageCount=20`, {
    headers: getRequestHeader()
  })
}

/**
 * 拉取某个课程的信息
 * @param {*} id 课程id
 */
function getCourseInfo(id) {
  return axios.post(`https://wap-api.xplus.xiaodengta.com/zaker/course/courseInfo`, { id }, {
    headers: getRequestHeader()
  })
}

function downloadMp3(savePath, url) {
  return new Promise(async resolve => {
    try {
      if (!url || !savePath) {
        resolve()
        return
      }

      fs.writeFileSync(savePath, await download(url))
      resolve()
    } catch (error) {
      console.warn(error)
      resolve()
    }
  })
}

async function main() {

  try {
    const courseInfo = (await getCourseInfo(config.learnCourseId)).data.data
    const courseTitle = courseInfo.title
    console.log(`课程 - ${courseTitle}`)
    const sectionList = (await getCourseSectionList(config.learnCourseId)).data.data

    const courseDir = path.join('course', `${config.learnCourseId}-${courseTitle}`)

    if (!fs.existsSync(courseDir)) {
      fs.mkdirSync(courseDir)
    }

    const downloadJobs = []
    sectionList.forEach(section => {
      const sectionPath = path.join(courseDir, `${section.title}.mp3`)

      console.log(` |- 章节 - ${section.title}`)
      downloadJobs.push(downloadMp3(sectionPath, section.av.url))
    })
    console.log('')
    console.log('⏳ 下载中')
    await Promise.all(downloadJobs)
    console.log(`🚀 下载完成`)
    await delay(5)
  } catch (error) {
    console.warn('下载课程mp3失败')
    console.warn(error)
  }


}

main()