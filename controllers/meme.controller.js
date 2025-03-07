const { default: mongoose, model } = require("mongoose");
const Meme = require("../models/meme.model");
const LikeDislike = require("../models/like_dislike.model");
const Comment = require("../models/comment.model");
const cloudinary = require('../utils/cloudinary');
const { decode } = require("jsonwebtoken");

/**
 *
 * @param {Object} model - Database Model to get results from
 * @param {Object[]} pipelineArray - aggregate pipeline staeges for Model.aggregate()
 * @param {string} next - base64 encoded next cursor for fetching records
 * @param {Object[]} populateArr - (Optional) populate options objects in array format for Model.populate()
 * @returns {Promise} - Object with following properties
 *  - data: actual records from database
 * - hasMore: whether there are more records to traverse or not
 * - nextCursor: base64 encoded cursor for traversing next results
 */
async function aggregatedPaginatedResults(
  model,
  pipelineArray,
  next,
  populateArr,
  sort = -1
) {
  return new Promise((resolve, reject) => {
    try {
      const limit = 10;
      const queryLimit = limit + 1; // +1 for next cursor

      let nextCursor = null;

      let finalResult = null;

      if (next && next !== false && next?.length > 0) {
        const decoded = Buffer.from(next, 'base64').toString('ascii');

        if (mongoose.isObjectIdOrHexString(decode)) {
          pipelineArray.push({
            $match: {
              _id: {
                $lte: new mongoose.Types.ObjectId(decoded),
              },
            },
          });
        }
      }

      const preparedPipeline = [
        ...pipelineArray,
      ];
      // Adding sort aggregation result
      if (sort !== 0) {
        preparedPipeline.push({
          $sort: { _id: sort },
        });
      }
      // Adding limit to aggregation result
      preparedPipeline.push({ $limit: queryLimit });

      model
        .aggregate(preparedPipeline)
        .exec()
        .then(async results => {
          if (populateArr?.length > 0 && results.length > 0) {
            try {
              finalResult = await model.populate(results, [...populateArr]);
            } catch (errPopulate) {
              reject(errPopulate);
            }
          } else {
            finalResult = results;
          }

          const hasMore = finalResult.length === queryLimit; // check if there are more results to show

          if (hasMore) {
            nextCursor = Buffer.from(
              finalResult[limit]._id.toString()
            ).toString('base64'); // encode the next cursor to base64
            finalResult.pop(); // removing the record with the next cursor
          }

          resolve({
            data: finalResult.filter(value => value),
            hasMore,
            nextCursor,
          });
        })
        .catch(e => reject(e));
    } catch (err) {
      console.error('[FN]: error in aggregatedPaginatedResults: ', err);
      reject(err);
    }
  });
}

const getMemes = async (req, res) => {
  const { search, next, category, sortby } = req.query;
  console.log(req.query);
  const filters = [{ search }, { category }, { sortby }];
  const pipelineArr = [
    {
      $match: {},
    },
  ];

  const matchObj = pipelineArr[0].$match;

  // assigning filter values if specified in req.query
  filters.forEach((filter) => {
    Object.entries(filter).forEach(([key, value]) => {
      if (value) {
        if (key === "search") {
          matchObj.name = {
            $regex: new RegExp(value, "i"),
          };
        } else if (key === "category") {
          if (category === 'trending') {
            pipelineArr.push({
              $sort: { likes: -1 }
            });
          }
          if (category === 'new') {
            pipelineArr.push({
              $sort: { createdAt: -1 }
            });
          }
        } else if (key === "sortby") {
          if (sortby === 'likes' && category !== 'trending') {
            pipelineArr.push({
              $sort: { likes: -1 }
            });
          }
          if (sortby === 'date' && category !== 'new') {
            pipelineArr.push({
              $sort: { createdAt: -1 }
            });
          }
          if (sortby === 'comments') {
            pipelineArr.push({
              $addFields: {
                count: { $size: '$comments' }
              }
            })
            pipelineArr.push({
              $sort: { count: -1 }
            });
          }
        }
      }
    });
  });

  // console.log('Memes Pipeline : ', pipelineArr);

  const result = await aggregatedPaginatedResults(Meme, pipelineArr, next);
  try {
    return res.status(200).json({
      message: "Memes Found",
      memes: result?.data,
      paging: {
        hasMore: result.hasMore,
        next: result.nextCursor,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getMeme = async (req, res) => {
  try {
    const { memeId } = req.params;
    // console.log(req.user);
    if (!memeId) {
        return res.status(400).json({
            message: "Meme ID is required"
        });
    }
    const meme = await Meme.findById(memeId).populate({
        path: 'comments', // Populate the comments array
        select: 'content user createdAt',
        populate: {
          path: 'user', // Populate the user inside each comment
          model: 'User', // The model name for the user
          select: 'name email'
        }
      })

    const check = await LikeDislike.findOne({ memeId, useId: req.user?._id });
    return res.status(200).json({
      message: "Meme Found",
      meme: {
        ...meme?._doc,
        like: check ? check.type : '',
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const postMeme = async (req, res) => {
    try {
        const data = { ...req.body, user: req.user._id };
        if (req.body.url) {
            const result = await cloudinary.uploader.upload(req.body.url, {
                resource_type: 'auto',  // Automatically detect file type
            });
            data.url = result.secure_url;
        }
        const newMeme = await Meme.create(data);
        if (newMeme) {
            return res.status(201).json({
                message: "Posted Successfully!!"
            });
        }
        return res.status(404).json({
            message: "Error posting meme..."
        })
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const addComment = async (req, res) => {
  const { memeId } = req.params;
  const { user, content } = req.body;

  const comment = new Comment({ memeId, user, content });
  await comment.save();

  // Add comment to the post
  const post = await Meme.findById(memeId);
  post.comments.push(comment._id);
  await post.save();

  res.status(201).json(comment);
};

const likeDislike = async (req, res) => {
  const { memeId } = req.params;
  const { userId, type } = req.body;
  // console.log(userId, type);
  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({ error: "Invalid like/dislike type" });
  }

  const post = await Meme.findById(memeId);

  // Check if the user has already liked/disliked the post
  const existingLike = await LikeDislike.findOne({ memeId: post?._id, userId });
  if (existingLike) {
    console.log('Existing Like :', existingLike);
    const _type_ = type === existingLike.type ? "" : type;
    console.log(_type_);
    await LikeDislike.findOneAndUpdate(
      { memeId, userId },
      { type: _type_ }
    ).exec();
  } else {
    await LikeDislike.create({ memeId, userId, type });
  }

  if (type === "like") {
    if (existingLike?.type === "like") {
      if (post.likes > 0) {
        post.likes -= 1;
      }
    } else {
      post.likes += 1;
    }
  } else {
    if (existingLike?.type === "dislike") {
      if (post.dislikes > 0) {
        post.dislikes -= 1;
      }
    } else {
      if (existingLike?.type === "like") {
        if (post.likes > 0) {
          post.likes -= 1;
        }
      }
      post.dislikes += 1;
    }
  }
  await post.save();

  res.status(201).json(likeDislike);
};

const getMostLikedMemes = async (req, res) => {
    try {
        const memes = await Meme.aggregate([
            {
              $sort: { likes: -1 }  // Sort by the 'likes' field in descending order
            },
            {
              $limit: 10  // Limit the results to the top 10 most liked memes (you can adjust this number)
            },
            {
              $lookup: {
                from: 'comments',  // Lookup comments related to the meme
                localField: 'comments',
                foreignField: '_id',
                as: 'comments'
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                url: 1,
                width: 1,
                height: 1,
                box_count: 1,
                likes: 1,
                dislikes: 1,
                comments: 1,
                createdAt: 1,
                updatedAt: 1
              }
            }
          ]);

          return res.status(200).json({
            message: "Most Liked Memes",
            memes: memes
          })
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

module.exports.getMemes = getMemes;
module.exports.getMeme = getMeme;
module.exports.getMostLikedMemes = getMostLikedMemes;
module.exports.postMeme = postMeme;
module.exports.addComment = addComment;
module.exports.likeDislike = likeDislike;
