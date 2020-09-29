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

function downloadCourseSection(courseDirPath, section, no) {
  return new Promise(async resolve => {
    try {

      const {av,title} = section
      const {url, fileName} = av
      if (!url || !courseDirPath) {
        console.warn(JSON.stringify(section))
        resolve()
        return
      }

      // 文件后缀
      const suffix = fileName.split('.')[1]

      const _fileName = `${no}-${title}.${suffix}`

      const savePath = path.join(courseDirPath, _fileName)
      fs.writeFileSync(savePath, await download(url))
      resolve()
    } catch (error) {
      console.warn(error)
      resolve()
    }
  })
}

async function main() {
  const courseDirRootPath = path.join('/Volumes', 'Passport','Course')

  for (let courseId = 1; courseId < 44; courseId++) {


    try {
      const courseInfo = (await getCourseInfo(courseId)).data.data
      const courseTitle = courseInfo.title
      console.log(`课程 - ${courseTitle}`)

      const courseDir = path.join(courseDirRootPath, `${courseId}-${courseTitle}`)

      if (!fs.existsSync(courseDir)) {
        fs.mkdirSync(courseDir)
      }

      // 获取课程章节
      const sectionList = (await getCourseSectionList(courseId)).data.data


      for (let index = 0; index < sectionList.length; index++) {
        const section = sectionList[index]
        
        console.log(` |- 章节${index+1} - ${section.title}`)
        await downloadCourseSection(courseDir, section, index+1)
      }
      // await Promise.all(downloadJobs)
      console.log(`🚀 下载完成`)
      await delay(5)
    } catch (error) {
      console.warn('下载课程失败',courseId)
      console.warn(error)
    }


  }

}


// function main() {
//   const p = path.join('/Volumes', 'Passport','a')
//   fs.mkdirSync(p)
//   console.log('end')
// }

main()