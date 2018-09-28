const gulp = require('gulp')
const clean = require('gulp-clean')
const inlinesource = require('gulp-inline-source')

gulp.task('clean', function () {
  return gulp.src('dist', { read: false, allowEmpty: true })
    .pipe(clean())
})

gulp.task('inlinesource', function () {
  return gulp.src('dist/index.html')
    .pipe(inlinesource())
    .pipe(gulp.dest('../src/'))
})

gulp.task('default', gulp.parallel('inlinesource'))
